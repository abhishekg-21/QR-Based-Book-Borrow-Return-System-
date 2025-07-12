document.addEventListener("DOMContentLoaded", () => {
  document
    .getElementById("login-btn")
    .addEventListener("click", validateReader);
  document
    .getElementById("submit-return-btn")
    .addEventListener("click", submitReturn); // Added ID for event listener
  document.getElementById("search-book").addEventListener("keyup", searchBooks);
  document
    .getElementById("modal-close-btn")
    .addEventListener("click", closeModal); // Added ID for modal close button
});

let selectedBooks = [];
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
      document.getElementById("book-section").classList.remove("hidden");
      fetchBorrowedBooks(); // Fetch books after successful login
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
 * Fetches borrowed books for the logged-in reader (simulated).
 */
async function fetchBorrowedBooks() {
  try {
    // Simulate API call for borrowed books
    // In a real application, replace this with an actual fetch to your backend
    const response = await new Promise((resolve) =>
      setTimeout(() => {
        let books = [];
        if (readerID === "reader123") {
          books = [
            { book_id: 101, book_name: "The Great Gatsby" },
            { book_id: 105, book_name: "The Catcher in the Rye" },
          ];
        } else if (readerID === "reader456") {
          books = [{ book_id: 102, book_name: "1984" }];
        }
        resolve({ json: () => Promise.resolve(books) });
      }, 500)
    );

    const books = await response.json();
    renderBookList(books);
  } catch (error) {
    console.error("🚨 Fetch Borrowed Books Error:", error);
    showModal("Error", "❌ Failed to load borrowed books.");
  }
}

/**
 * Renders the list of borrowed books in the UI.
 * @param {Array<Object>} books - An array of book objects.
 */
function renderBookList(books) {
  const bookList = document.getElementById("book-list");
  bookList.innerHTML = ""; // Clear previous list

  if (books.length === 0) {
    bookList.innerHTML =
      '<p class="text-gray-600 p-4">No books currently borrowed.</p>';
    return;
  }

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
 * Selects or deselects a book for return.
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
      showModal("Limit Reached", "⚠️ You can only return 2 books at a time!");
      return;
    }
    selectedBooks.push(bookID);
    bookButton.classList.remove("bg-blue-500", "hover:bg-blue-600");
    bookButton.classList.add("bg-red-500", "hover:bg-red-600");
    bookButton.textContent = "Selected";
  }
}

/**
 * Submits the return request for selected books.
 */
async function submitReturn() {
  if (selectedBooks.length === 0) {
    showModal("No Books Selected", "⚠️ Select at least one book to return!");
    return;
  }

  try {
    // Simulate API call to check pending return requests
    const requestCheck = await new Promise((resolve) =>
      setTimeout(() => {
        let pendingRequests = 0;
        // Example: reader123 has 1 pending return request
        if (readerID === "reader123") {
          pendingRequests = 1;
        }
        resolve({
          json: () => Promise.resolve({ request_count: pendingRequests }),
        });
      }, 300)
    );

    const requestData = await requestCheck.json();

    if (requestData.request_count + selectedBooks.length > 2) {
      showModal(
        "Request Limit Exceeded",
        `⚠️ You already have ${requestData.request_count} pending return request(s). You can only have a maximum of 2 pending requests. Redirecting to Welcome Page.`,
        () => {
          window.location.href = "welcome.html";
        } // Callback to redirect
      );
      return;
    }

    // Simulate API call for submitting return request
    const response = await new Promise((resolve) =>
      setTimeout(() => {
        if (selectedBooks.length > 0) {
          resolve({
            json: () =>
              Promise.resolve({
                success: true,
                message: "Return request submitted successfully!",
              }),
          });
        } else {
          resolve({
            json: () =>
              Promise.resolve({
                success: false,
                message: "No books selected for return.",
              }),
          });
        }
      }, 1000)
    );

    const data = await response.json();
    if (data.success) {
      showModal("Success!", "✅ Return request submitted!");
      selectedBooks = []; // Clear selected books after successful submission
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
