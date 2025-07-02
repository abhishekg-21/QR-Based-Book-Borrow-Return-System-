const express = require("express");
const app = express();
const cors = require("cors");
const { Pool } = require("pg");
const path = require("path");

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

// PostgreSQL Connection
const pool = new Pool({
  user: "neondb_owner",
  host: "ep-hidden-heart-a84r8c4i-pooler.eastus2.azure.neon.tech",
  database: "neondb",
  password: "npg_eBCdj06kmtJf",
  ssl: { rejectUnauthorized: false },
});

// ✅ Serve `welcome.html` as the home page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "welcome.html"));
});

// 📌 Validate Reader & Check Borrowed/Requested Books
app.get("/validate-reader", async (req, res) => {
  const { reader_id, full_name } = req.query;

  try {
    // Check if reader exists
    const readerCheck = await pool.query(
      "SELECT * FROM readers WHERE reader_id = $1 AND full_name = $2",
      [reader_id, full_name]
    );
    if (readerCheck.rowCount === 0) {
      return res.json({ valid: false, message: "Invalid Reader ID or Name." });
    }

    // Check number of requested books
    const requestedResult = await pool.query(
      "SELECT COUNT(*) FROM borrow_request WHERE reader_id = $1",
      [reader_id]
    );
    const requestedCount = parseInt(requestedResult.rows[0].count);

    res.json({
      valid: true,

      requested: requestedCount,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ valid: false, message: "Error checking reader details." });
  }
});

// 📌 Fetch Available Books
app.get("/available-books", async (req, res) => {
  try {
    const books = await pool.query(
      "SELECT book_id, book_name FROM books WHERE status = 'Available'"
    );
    res.json(books.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json([]);
  }
});

// 📌 Borrow Request Submission
app.post("/submit-borrow", async (req, res) => {
  const { reader_id, books } = req.body;

  try {
    // Check current request count
    const requestCountResult = await pool.query(
      "SELECT COUNT(*) FROM borrow_request WHERE reader_id = $1",
      [reader_id]
    );
    const requestedCount = parseInt(requestCountResult.rows[0].count);
    if (requestedCount + books.length > 2) {
      return res.json({
        success: false,
        message: "You have already requested 2 books. You cannot request more.",
      });
    }

    // Insert borrow request
    for (let book_id of books) {
      await pool.query(
        "INSERT INTO borrow_request (reader_id, book_id) VALUES ($1, $2)",
        [reader_id, book_id]
      );
    }

    res.json({ success: true, message: "Request submitted successfully!" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ success: false, message: "Error submitting borrow request." });
  }
});

// return process

// ✅ Route to count return requests for a reader
app.get("/check-return-requests", async (req, res) => {
  const { reader_id } = req.query;
  if (!reader_id)
    return res.status(400).json({ error: "Reader ID is required" });

  try {
    const result = await pool.query(
      "SELECT COUNT(*) FROM return_request WHERE reader_id = $1 AND status = 'pending'",
      [reader_id]
    );

    res.json({ request_count: parseInt(result.rows[0].count) });
  } catch (error) {
    console.error("Error checking return requests:", error);
    res.status(500).json({ error: "Server error" });
  }
});

// ✅ Fetch Borrowed Books
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
    console.error(error);
    res.status(500).json({ success: false, message: "Server error!" });
  }
});

// ✅ Submit Return Request
app.post("/submit-return", async (req, res) => {
  const { reader_id, books } = req.body;

  if (!reader_id || books.length === 0) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid request!" });
  }

  try {
    for (const book_id of books) {
      await pool.query(
        "INSERT INTO return_request (reader_id, book_id) VALUES ($1, $2)",
        [reader_id, book_id]
      );
    }

    res.json({ success: true, message: "Return request submitted!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Server error!" });
  }
});

// details

// ✅ Get Reader Details API
app.get("/reader-details", async (req, res) => {
  const { reader_id } = req.query;
  try {
    const result = await pool.query(
      "SELECT full_name, email, mobile_number, TO_CHAR(dob, 'YYYY-MM-DD') AS dob, gender, address FROM readers WHERE reader_id = $1",
      [reader_id]
    );
    res.json(result.rows[0] || {});
  } catch (error) {
    console.error(error);
    res.status(500).json({});
  }
});

// ✅ Get Issued Books API
app.get("/issued-books", async (req, res) => {
  const { reader_id } = req.query;
  try {
    const result = await pool.query(
      `SELECT books.book_id,books.book_name, 
                    TO_CHAR(issued_books.issue_date, 'YYYY-MM-DD') AS issue_date, 
                    TO_CHAR(issued_books.due_date, 'YYYY-MM-DD') AS due_date, 
                    TO_CHAR(issued_books.return_date, 'YYYY-MM-DD') AS return_date
             FROM issued_books
             JOIN books ON issued_books.book_id = books.book_id
             WHERE issued_books.reader_id = $1`,
      [reader_id]
    );
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json([]);
  }
});

// ✅ Export the app for Vercel
// module.exports = app;
const PORT = 8080;
app.listen(Port, () => {
  console.log(`Server is listening on port ${PORT}`);
});
