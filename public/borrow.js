document.addEventListener("DOMContentLoaded", () => {
  // Attach event listeners after the DOM is fully loaded
  document
    .getElementById("login-btn")
    .addEventListener("click", validateReader);
  document
    .getElementById("submit-borrow-btn")
    .addEventListener("click", submitBorrow);
  document.getElementById("search-book").addEventListener("keyup", searchBooks); // Attach listener for search input
  document
    .getElementById("modal-close-btn")
    .addEventListener("click", closeModal); // Attach listener for modal close button

  fetchAvailableBooks();
});

let selectedBooks = [];
let readerID = "";
let requestCount = 0; // Stores the number of books already requested by the reader

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
 * On successful validation, hides login section and shows book selection.
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
    // In a real application, replace this with an actual fetch to your backend
    // const response = await fetch(`/validate-reader?reader_id=${id}&full_name=${encodeURIComponent(name)}`);
    // const data = await response.json();

    // Simulate API call for reader validation
    const response = await new Promise((resolve) =>
      setTimeout(() => {
        if (id === "reader123" && name === "John Doe") {
          resolve({
            json: () => Promise.resolve({ valid: true, requested: 1 }),
          }); // Example: reader123 has 1 requested book
        } else if (id === "reader456" && name === "Jane Smith") {
          resolve({
            json: () => Promise.resolve({ valid: true, requested: 0 }),
          }); // Example: reader456 has 0 requested books
        } else if (id === "reader789" && name === "Bob Johnson") {
          resolve({
            json: () => Promise.resolve({ valid: true, requested: 2 }),
          }); // Example: reader789 has 2 requested books
        } else {
          resolve({ json: () => Promise.resolve({ valid: false }) });
        }
      }, 500)
    );

    const data = await response.json();

    if (data.valid) {
      showModal("Success!", "✅ Login Successful!");
      readerID = id;
      requestCount = data.requested; // Store number of requested books
      document.getElementById("login-section").classList.add("hidden");
      document.getElementById("book-section").classList.remove("hidden");
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
 * Fetches available books from the backend (simulated).
 */
async function fetchAvailableBooks() {
  try {
    // In a real application, replace this with an actual fetch to your backend
    // const response = await fetch("/available-books");
    // const books = await response.json();

    // Simulate API call for available books
    const response = await new Promise((resolve) =>
      setTimeout(() => {
        resolve({
          json: () =>
            Promise.resolve([
              { book_id: 101, book_name: "The Great Gatsby" },
              { book_id: 102, book_name: "1984" },
              { book_id: 103, book_name: "To Kill a Mockingbird" },
              { book_id: 104, book_name: "Pride and Prejudice" },
              { book_id: 105, book_name: "The Catcher in the Rye" },
              { book_id: 106, book_name: "Moby Dick" },
              { book_id: 107, book_name: "War and Peace" },
              { book_id: 108, book_name: "The Odyssey" },
              { book_id: 109, book_name: "Crime and Punishment" },
              { book_id: 110, book_name: "Don Quixote" },
            ]),
        });
      }, 500)
    );
    const books = await response.json();
    renderBookList(books);
  } catch (error) {
    console.error("🚨 Fetch Books Error:", error);
    showModal("Error", "❌ Failed to load available books.");
  }
}

/**
 * Renders the list of available books in the UI.
 * @param {Array<Object>} books - An array of book objects.
 */
function renderBookList(books) {
  const bookList = document.getElementById("book-list");
  bookList.innerHTML = ""; // Clear previous list

  books.forEach((book) => {
    const bookItem = document.createElement("div");
    bookItem.classList.add(
      "book-item",
      "flex",
      "justify-between",
      "items-center",
      "p-3",
      "border-b",
      "border-gray-200",
      "last:border-b-0",
      "bg-white",
      "hover:bg-gray-100",
      "transition",
      "duration-150",
      "rounded-md"
    );

    const bookInfoSpan = document.createElement("span");
    bookInfoSpan.classList.add(
      "text-gray-800",
      "font-medium",
      "text-left",
      "flex-grow"
    );
    bookInfoSpan.textContent = `${book.book_id} - ${book.book_name}`;

    const selectButton = document.createElement("button");
    selectButton.id = `book-${book.book_id}`;
    selectButton.classList.add(
      "ml-4",
      "py-1",
      "px-3",
      "text-sm",
      "font-semibold",
      "rounded-md",
      "bg-blue-500",
      "text-white",
      "hover:bg-blue-600",
      "focus:outline-none",
      "focus:ring-2",
      "focus:ring-blue-400",
      "focus:ring-opacity-75",
      "transition-all",
      "duration-200",
      "ease-in-out"
    );
    selectButton.textContent = "Select";
    // Attach event listener directly
    selectButton.addEventListener("click", () => selectBook(book.book_id));

    bookItem.appendChild(bookInfoSpan);
    bookItem.appendChild(selectButton);
    bookList.appendChild(bookItem);
  });
}

/**
 * Filters the book list based on search input.
 */
function searchBooks() {
  const searchValue = document
    .getElementById("search-book")
    .value.toLowerCase();
  const bookItems = document.querySelectorAll(".book-item");

  bookItems.forEach((item) => {
    const text = item.textContent.toLowerCase();
    item.style.display = text.includes(searchValue) ? "flex" : "none";
  });
}

/**
 * Selects or deselects a book for borrowing.
 * @param {number} bookID - The ID of the book to select/deselect.
 */
function selectBook(bookID) {
  const bookButton = document.getElementById(`book-${bookID}`);

  if (selectedBooks.includes(bookID)) {
    // Deselect the book
    selectedBooks = selectedBooks.filter((id) => id !== bookID);
    bookButton.classList.remove("bg-red-500", "hover:bg-red-600");
    bookButton.classList.add("bg-blue-500", "hover:bg-blue-600");
    bookButton.textContent = "Select";
  } else {
    // Select the book
    if (selectedBooks.length >= 2) {
      showModal("Limit Reached", "⚠️ You can only request 2 books at a time!");
      return;
    }
    selectedBooks.push(bookID);
    bookButton.classList.remove("bg-blue-500", "hover:bg-blue-600");
    bookButton.classList.add("bg-red-500", "hover:bg-red-600");
    bookButton.textContent = "Selected";
  }
}

/**
 * Submits the borrow request for selected books.
 */
async function submitBorrow() {
  if (selectedBooks.length === 0) {
    showModal("No Books Selected", "⚠️ Select at least one book!");
    return;
  }

  // Use stored request count to check total requests
  if (requestCount + selectedBooks.length > 2) {
    showModal(
      "Request Limit Exceeded",
      "⚠️ You have already requested " +
        requestCount +
        " book(s). You can only have a maximum of 2 requested books at a time. Redirecting to Welcome Page.",
      () => {
        window.location.href = "welcome.html";
      } // Callback to redirect after modal closes
    );
    return;
  }

  try {
    // In a real application, replace this with an actual fetch to your backend
    // const response = await fetch("/submit-borrow", {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify({ reader_id: readerID, books: selectedBooks }),
    // });
    // const data = await response.json();

    // Simulate API call for submitting borrow request
    const response = await new Promise((resolve) =>
      setTimeout(() => {
        // Simulate success or failure
        if (selectedBooks.length > 0) {
          resolve({
            json: () =>
              Promise.resolve({
                success: true,
                message: "Borrow request submitted successfully!",
              }),
          });
        } else {
          resolve({
            json: () =>
              Promise.resolve({
                success: false,
                message: "No books selected for borrowing.",
              }),
          });
        }
      }, 1000)
    );

    const data = await response.json();
    if (data.success) {
      showModal("Success!", "✅ Borrow request submitted!");
      selectedBooks = []; // Clear selected books after successful submission
      // Redirect after a short delay or after modal closes
      setTimeout(() => {
        window.location.href = "welcome.html";
      }, 1500); // Redirect after 1.5 seconds
    } else {
      showModal("Error", data.message);
    }
  } catch (error) {
    console.error("🚨 Submit Error:", error);
    showModal("Error", "❌ Error submitting request!");
  }
}
