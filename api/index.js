const express = require("express");
const app = express();
const cors = require("cors");
const { Pool } = require("pg");
const path = require("path");
// Load environment variables from .env file (if using dotenv)
// require('dotenv').config();

// Middleware
// Enable JSON body parsing for incoming requests
app.use(express.json());
// Enable CORS for all routes, allowing cross-origin requests from your frontend
app.use(cors());
// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, "public")));

// PostgreSQL Connection Pool Configuration
// It's highly recommended to use environment variables for sensitive information like database credentials.
// Example: process.env.DB_USER, process.env.DB_HOST, etc.
const pool = new Pool({
  user: "neondb_owner",
  host: "ep-hidden-heart-a84r8c4i-pooler.eastus2.azure.neon.tech",
  database: "neondb",
  password: "npg_OAPGCtyKX02E",
  // Ensure rejectUnauthorized is false if using a self-signed certificate or for development.
  // For production, consider proper SSL certificate validation.
  ssl: { rejectUnauthorized: false },
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    return console.error("Error acquiring client", err.stack);
  }
  console.log("Connected to PostgreSQL database!");
  client.release();
});

// --- API Routes ---

// Serve `welcome.html` as the home page
// When a GET request is made to the root URL, send the welcome.html file.
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "welcome.html"));
});

// API to Validate Reader & Check Borrowed/Requested Books
// This endpoint checks if a reader exists and retrieves their current count of requested books.
app.get("/validate-reader", async (req, res) => {
  const { reader_id, full_name } = req.query; // Extract reader_id and full_name from query parameters

  // Basic input validation
  if (!reader_id || !full_name) {
    return res
      .status(400)
      .json({ valid: false, message: "Reader ID and Full Name are required." });
  }

  try {
    // Query to check if the reader exists in the 'readers' table
    const readerCheck = await pool.query(
      "SELECT * FROM readers WHERE reader_id = $1 AND full_name = $2",
      [reader_id, full_name]
    );

    // If no reader found, return invalid response
    if (readerCheck.rowCount === 0) {
      return res.json({ valid: false, message: "Invalid Reader ID or Name." });
    }

    // Query to count the number of pending borrow requests for the reader
    const requestedResult = await pool.query(
      "SELECT COUNT(*) FROM borrow_request WHERE reader_id = $1 AND status = 'pending'",
      [reader_id]
    );
    const requestedCount = parseInt(requestedResult.rows[0].count); // Parse count to integer

    // Return valid status and the count of requested books
    res.json({
      valid: true,
      requested: requestedCount,
    });
  } catch (error) {
    console.error("Error in /validate-reader:", error);
    // Return a 500 status code for server errors
    res
      .status(500)
      .json({ valid: false, message: "Error checking reader details." });
  }
});

// API to Fetch Available Books
// This endpoint retrieves a list of books that are currently 'Available'.
app.get("/available-books", async (req, res) => {
  try {
    // Query to select book_id and book_name from 'books' table where status is 'Available'
    const books = await pool.query(
      "SELECT book_id, book_name FROM books WHERE status = 'Available'"
    );
    // Send the rows as a JSON array
    res.json(books.rows);
  } catch (error) {
    console.error("Error in /available-books:", error);
    res
      .status(500)
      .json({ message: "Error fetching available books.", books: [] });
  }
});

// API for Borrow Request Submission
// This endpoint handles the submission of new book borrow requests.
app.post("/submit-borrow", async (req, res) => {
  const { reader_id, books } = req.body; // Extract reader_id and array of book_ids from request body

  // Basic input validation
  if (!reader_id || !Array.isArray(books) || books.length === 0) {
    return res.status(400).json({
      success: false,
      message:
        "Invalid request data. Reader ID and at least one book are required.",
    });
  }

  const client = await pool.connect(); // Get a client from the pool
  try {
    await client.query("BEGIN"); // Start a transaction

    // Check current request count for the reader to enforce limits
    const requestCountResult = await client.query(
      "SELECT COUNT(*) FROM borrow_request WHERE reader_id = $1 AND status = 'pending'",
      [reader_id]
    );
    const requestedCount = parseInt(requestCountResult.rows[0].count);

    // If adding new books exceeds the limit of 2, return an error
    if (requestedCount + books.length > 2) {
      await client.query("ROLLBACK"); // Rollback the transaction
      return res.status(400).json({
        success: false,
        message: `You currently have ${requestedCount} pending requests. You can only request up to 2 books in total.`,
      });
    }

    // Iterate through each book and insert a new borrow request
    for (let book_id of books) {
      // Check if the book is actually available before requesting
      const bookStatus = await client.query(
        "SELECT status FROM books WHERE book_id = $1",
        [book_id]
      );
      if (
        bookStatus.rowCount === 0 ||
        bookStatus.rows[0].status !== "Available"
      ) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          success: false,
          message: `Book ID ${book_id} is not available.`,
        });
      }

      // Insert the borrow request with a 'pending' status
      await client.query(
        "INSERT INTO borrow_request (reader_id, book_id, request_date, status) VALUES ($1, $2, NOW(), 'pending')",
        [reader_id, book_id]
      );
      // Optionally, update book status to 'Requested' or 'Borrowed' here if the process is immediate
      // await client.query("UPDATE books SET status = 'Requested' WHERE book_id = $1", [book_id]);
    }

    await client.query("COMMIT"); // Commit the transaction
    res.json({
      success: true,
      message: "Borrow request(s) submitted successfully!",
    });
  } catch (error) {
    await client.query("ROLLBACK"); // Rollback on error
    console.error("Error in /submit-borrow:", error);
    res
      .status(500)
      .json({ success: false, message: "Error submitting borrow request." });
  } finally {
    client.release(); // Release the client back to the pool
  }
});

// --- Return Process API ---

// Route to count pending return requests for a reader
// This helps the frontend enforce the limit of 2 pending return requests.
app.get("/check-return-requests", async (req, res) => {
  const { reader_id } = req.query;
  if (!reader_id) {
    return res.status(400).json({ error: "Reader ID is required" });
  }

  try {
    const result = await pool.query(
      "SELECT COUNT(*) FROM return_request WHERE reader_id = $1 AND status = 'pending'",
      [reader_id]
    );
    // Send the count of pending return requests
    res.json({ request_count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error("Error checking return requests:", error);
    res
      .status(500)
      .json({ error: "Server error while checking return requests." });
  }
});

// API to Fetch Borrowed Books for a specific reader
// This endpoint retrieves books currently issued to a reader that have not yet been returned.
app.get("/borrowed-books", async (req, res) => {
  const { reader_id } = req.query;

  if (!reader_id) {
    return res
      .status(400)
      .json({ success: false, message: "Reader ID is required!" });
  }

  try {
    const result = await pool.query(
      `SELECT ib.book_id, b.book_name 
             FROM issued_books ib 
             JOIN books b ON ib.book_id = b.book_id 
             WHERE ib.reader_id = $1 AND ib.return_date IS NULL`, // Only fetch books not yet returned
      [reader_id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error in /borrowed-books:", error);
    res.status(500).json({
      success: false,
      message: "Server error fetching borrowed books!",
    });
  }
});

// API to Submit Return Request
// This endpoint handles the submission of return requests for borrowed books.
app.post("/submit-return", async (req, res) => {
  const { reader_id, books } = req.body; // Extract reader_id and array of book_ids from request body

  if (!reader_id || !Array.isArray(books) || books.length === 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid request! Reader ID and at least one book are required.",
    });
  }

  const client = await pool.connect(); // Get a client from the pool
  try {
    await client.query("BEGIN"); // Start a transaction

    // Check if the reader already has 2 pending return requests (re-check for race conditions)
    const requestCountResult = await client.query(
      "SELECT COUNT(*) FROM return_request WHERE reader_id = $1 AND status = 'pending'",
      [reader_id]
    );
    const pendingReturnCount = parseInt(requestCountResult.rows[0].count);

    if (pendingReturnCount + books.length > 2) {
      await client.query("ROLLBACK");
      return res.status(400).json({
        success: false,
        message: `You already have ${pendingReturnCount} pending return requests. You can only request to return up to 2 books at a time.`,
      });
    }

    // Insert each book into the return_request table
    for (const book_id of books) {
      // Optional: Verify the book is actually borrowed by this reader and not already pending return
      const checkBorrowed = await client.query(
        "SELECT * FROM issued_books WHERE reader_id = $1 AND book_id = $2 AND return_date IS NULL",
        [reader_id, book_id]
      );
      if (checkBorrowed.rowCount === 0) {
        await client.query("ROLLBACK");
        return res.status(400).json({
          success: false,
          message: `Book ID ${book_id} is not currently borrowed by this reader or already returned/pending.`,
        });
      }

      await client.query(
        "INSERT INTO return_request (reader_id, book_id, request_date, status) VALUES ($1, $2, NOW(), 'pending')",
        [reader_id, book_id]
      );
    }

    await client.query("COMMIT"); // Commit the transaction
    res.json({ success: true, message: "Return request(s) submitted!" });
  } catch (error) {
    await client.query("ROLLBACK"); // Rollback on error
    console.error("Error in /submit-return:", error);
    res.status(500).json({
      success: false,
      message: "Server error submitting return request!",
    });
  } finally {
    client.release(); // Release the client back to the pool
  }
});

// --- Details API ---

// API to Get Reader Details
// This endpoint retrieves detailed information about a specific reader.
app.get("/reader-details", async (req, res) => {
  const { reader_id } = req.query;
  if (!reader_id) {
    return res.status(400).json({ message: "Reader ID is required." });
  }
  try {
    const result = await pool.query(
      "SELECT full_name, email, mobile_number, TO_CHAR(dob, 'YYYY-MM-DD') AS dob, gender, address FROM readers WHERE reader_id = $1",
      [reader_id]
    );
    // Return the first row if found, otherwise an empty object
    res.json(result.rows[0] || {});
  } catch (error) {
    console.error("Error in /reader-details:", error);
    res.status(500).json({ message: "Server error fetching reader details." });
  }
});

// API to Get Issued Books for a reader
// This endpoint retrieves all books ever issued to a reader, including their return status.
app.get("/issued-books", async (req, res) => {
  const { reader_id } = req.query;
  if (!reader_id) {
    return res.status(400).json({ message: "Reader ID is required." });
  }
  try {
    const result = await pool.query(
      `SELECT books.book_id, books.book_name, 
                    TO_CHAR(issued_books.issue_date, 'YYYY-MM-DD') AS issue_date, 
                    TO_CHAR(issued_books.due_date, 'YYYY-MM-DD') AS due_date, 
                    TO_CHAR(issued_books.return_date, 'YYYY-MM-DD') AS return_date
             FROM issued_books
             JOIN books ON issued_books.book_id = books.book_id
             WHERE issued_books.reader_id = $1
             ORDER BY issued_books.issue_date DESC`, // Order by issue date for better readability
      [reader_id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error("Error in /issued-books:", error);
    res.status(500).json({ message: "Server error fetching issued books." });
  }
});

// --- Server Startup ---

// Define the port to listen on
const PORT = process.env.PORT || 8080; // Use environment variable for port or default to 8080

// Start the Express server
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});

// Export the app for serverless environments like Vercel (uncomment if deploying to Vercel)
// module.exports = app;
