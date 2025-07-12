document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("login-btn")
    .addEventListener("click", validateReader);
  document
    .getElementById("modal-close-btn")
    .addEventListener("click", closeModal); // Added ID for modal close button
});

let readerID = "";

/**
 * Displays a custom modal message.
 * @param {string} title - The title of the modal.
 * @param {string} message - The message content.
 * @param {function} [callback] - Optional callback function to execute when modal is closed.
 */
function showModal(title, message, callback = null) {
  document.getElementById("modal-title").textContent = title;
  document.getElementById("modal-message").textContent = message;
  document.getElementById("custom-modal").classList.remove("hidden");
  // Store callback if provided, to be executed on modal close
  window.modalCallback = callback;
}

/**
 * Closes the custom modal and executes any stored callback.
 */
function closeModal() {
  document.getElementById("custom-modal").classList.add("hidden");
  if (window.modalCallback) {
    window.modalCallback();
    window.modalCallback = null; // Clear the callback
  }
}

/**
 * Validates reader ID and name.
 * On successful validation, hides login section and shows details section.
 */
async function validateReader() {
  const id = document.getElementById("reader-id").value.trim();
  const name = document.getElementById("reader-name").value.trim();
  const errorMessage = document.getElementById("error-message");

  if (!id || !name) {
    errorMessage.textContent = "⚠️ Reader ID and Name are required!";
    return;
  }

  try {
    // Simulate API call for reader validation
    // In a real application, replace this with an actual fetch to your backend
    const response = await new Promise((resolve) =>
      setTimeout(() => {
        if (id === "reader123" && name === "John Doe") {
          resolve({ json: () => Promise.resolve({ valid: true }) });
        } else if (id === "reader456" && name === "Jane Smith") {
          resolve({ json: () => Promise.resolve({ valid: true }) });
        } else {
          resolve({ json: () => Promise.resolve({ valid: false }) });
        }
      }, 500)
    );

    const data = await response.json();

    if (data.valid) {
      showModal("Success!", "✅ Login Successful!");
      readerID = id;
      document.getElementById("login-section").classList.add("hidden");
      document.getElementById("details-section").classList.remove("hidden");
      fetchReaderDetails();
      fetchIssuedBooks();
      errorMessage.textContent = "";
    } else {
      errorMessage.textContent = "❌ Invalid Reader ID or Name!";
    }
  } catch (error) {
    console.error("🚨 Validation Error:", error);
    errorMessage.textContent = "❌ Server error. Try again!";
  }
}

/**
 * Fetches reader details (simulated).
 */
async function fetchReaderDetails() {
  try {
    // Simulate API call for reader details
    // In a real application, replace this with an actual fetch to your backend
    const response = await new Promise((resolve) =>
      setTimeout(() => {
        let readerData = {};
        if (readerID === "reader123") {
          readerData = {
            full_name: "John Doe",
            email: "john.doe@example.com",
            mobile_number: "123-456-7890",
            dob: "1990-05-15 (34 years old)",
            gender: "Male",
            address: "123 Main St, Anytown, USA",
          };
        } else if (readerID === "reader456") {
          readerData = {
            full_name: "Jane Smith",
            email: "jane.smith@example.com",
            mobile_number: "098-765-4321",
            dob: "1988-11-22 (36 years old)",
            gender: "Female",
            address: "456 Oak Ave, Somewhere, USA",
          };
        }
        resolve({ json: () => Promise.resolve(readerData) });
      }, 500)
    );

    const data = await response.json();
    document.getElementById("reader-info").innerHTML = `
                    <p><strong class="font-semibold">Name:</strong> ${data.full_name}</p>
                    <p><strong class="font-semibold">Email:</strong> ${data.email}</p>
                    <p><strong class="font-semibold">Phone:</strong> ${data.mobile_number}</p>
                    <p><strong class="font-semibold">Age:</strong> ${data.dob}</p>
                    <p><strong class="font-semibold">Gender:</strong> ${data.gender}</p>
                    <p><strong class="font-semibold">Address:</strong> ${data.address}</p>
                `;
  } catch (error) {
    console.error("🚨 Fetch Reader Details Error:", error);
    showModal("Error", "❌ Failed to load reader details.");
  }
}

/**
 * Fetches issued books for the logged-in reader (simulated).
 */
async function fetchIssuedBooks() {
  try {
    // Simulate API call for issued books
    // In a real application, replace this with an actual fetch to your backend
    const response = await new Promise((resolve) =>
      setTimeout(() => {
        let books = [];
        if (readerID === "reader123") {
          books = [
            {
              book_id: 101,
              book_name: "The Great Gatsby",
              issue_date: "2024-06-01",
              due_date: "2024-07-01",
              return_date: null,
            },
            {
              book_id: 105,
              book_name: "The Catcher in the Rye",
              issue_date: "2024-06-10",
              due_date: "2024-07-10",
              return_date: null,
            },
            {
              book_id: 108,
              book_name: "The Odyssey",
              issue_date: "2024-05-20",
              due_date: "2024-06-20",
              return_date: "2024-06-18",
            },
          ];
        } else if (readerID === "reader456") {
          books = [
            {
              book_id: 102,
              book_name: "1984",
              issue_date: "2024-06-05",
              due_date: "2024-07-05",
              return_date: null,
            },
          ];
        }
        resolve({ json: () => Promise.resolve(books) });
      }, 500)
    );

    const books = await response.json();
    renderIssuedBooks(books);
  } catch (error) {
    console.error("🚨 Fetch Issued Books Error:", error);
    showModal("Error", "❌ Failed to load issued books.");
  }
}

/**
 * Renders the list of issued books in the UI.
 * @param {Array<Object>} books - An array of book objects.
 */
function renderIssuedBooks(books) {
  const bookList = document.getElementById("issued-books");
  bookList.innerHTML = ""; // Clear previous list

  if (books.length === 0) {
    bookList.innerHTML =
      '<p class="text-gray-600 p-4">No books currently issued to this reader.</p>';
    return;
  }

  books.forEach((book) => {
    const bookItem = document.createElement("div");
    bookItem.classList.add(
      "book-item",
      "p-4",
      "border",
      "border-gray-200",
      "rounded-md",
      "mb-3",
      "bg-white",
      "shadow-sm",
      "text-left"
    );

    bookItem.innerHTML = `
                    <p><strong class="font-semibold">Book ID:</strong> ${
                      book.book_id
                    }</p>
                    <p><strong class="font-semibold">Book Name:</strong> ${
                      book.book_name
                    }</p>
                    <p><strong class="font-semibold">Issue Date:</strong> ${
                      book.issue_date
                    }</p>
                    <p><strong class="font-semibold">Due Date:</strong> ${
                      book.due_date
                    }</p>
                    <p><strong class="font-semibold">Return Status:</strong> <span class="${
                      book.return_date ? "text-green-600" : "text-red-600"
                    } font-bold">${
      book.return_date ? "Returned" : "Pending"
    }</span></p>
                    ${
                      book.return_date
                        ? `<p><strong class="font-semibold">Return Date:</strong> ${book.return_date}</p>`
                        : ""
                    }
                `;
    bookList.appendChild(bookItem);
  });
}
