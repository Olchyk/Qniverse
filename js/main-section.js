import { API_URL } from "../config.js";

document.addEventListener("DOMContentLoaded", () => {
  const heroSection = document.querySelector(".hero");
  heroSection.style.display = "none";

  let currentPage = 1;
  const limit = 5;

  let paginationContainer = document.getElementById("pagination-container");
  if (!paginationContainer) {
    paginationContainer = document.createElement("div");
    paginationContainer.id = "pagination-container";
    paginationContainer.classList.add("pagination-container");
    document.body.appendChild(paginationContainer);
  }

  heroSection.after(paginationContainer);

  async function fetchQuestionnaires(page = 1) {
    heroSection.innerHTML = "<p>Loading...</p>";
    heroSection.style.display = "block";

    try {
      const response = await fetch(
        `${API_URL}/api/questionnaires-with-counts?page=${page}&limit=${limit}`,
        { cache: "no-store" }
      );

      let data = await response.json();

      console.log("Received data from the server:", data);

      if (!Array.isArray(data.questionnaires)) {
        console.error(
          "Incorrect data from the server (expected an array in 'questionnaires'):",
          data
        );
        heroSection.innerHTML = "<p>Error receiving questionnaires.</p>";
        paginationContainer.innerHTML = "";
        return;
      }

      const questionnaires = data.questionnaires;
      const totalPages = data.totalPages;
      setupPagination(totalPages, currentPage);

      heroSection.innerHTML = "";

      if (questionnaires.length === 0) {
        heroSection.innerHTML =
          "<p>There are currently no questionnaires available.</p>";
        paginationContainer.innerHTML = "";
        return;
      }

      questionnaires.forEach((questionnaire, index) => {
        const quizContainer = document.createElement("div");
        quizContainer.classList.add("quiz-container");

        const quizCard = document.createElement("div");
        quizCard.classList.add("quiz-card");
        quizCard.dataset.questionnaireId = questionnaire.id;

        const quizCardItem = document.createElement("div");
        quizCardItem.classList.add("quiz-card-item");
        quizCardItem.innerHTML = `
          <h3>${questionnaire.title}</h3>
          <p>${questionnaire.description || "No description"}</p>
          <p><strong>Amount of questions:</strong> ${
            questionnaire.questionsCount
          }</p>
        `;

        const quizButton = document.createElement("div");
        quizButton.classList.add("quiz-button");
        quizButton.innerHTML = `<span class="menu-icon" data-menu="menu${
          index + 1
        }">⋮</span>`;

        const dropdownMenu = document.createElement("div");
        dropdownMenu.classList.add("dropdown-menu");
        dropdownMenu.id = `menu${index + 1}`;
        dropdownMenu.innerHTML = `
        <ul>
          <li data-action="edit" data-id="${questionnaire.id}">Edit</li>
          <li data-action="run" data-id="${questionnaire.id}">Run</li>
          <li data-action="delete" data-id="${questionnaire.id}">Delete</li>
        </ul>
      `;

        quizCard.appendChild(quizCardItem);
        quizCard.appendChild(quizButton);
        quizCard.appendChild(dropdownMenu);
        quizContainer.appendChild(quizCard);
        heroSection.appendChild(quizContainer);
      });

      attachMenuEventListeners();

      setupPagination(data.totalPages, page);
    } catch (error) {
      console.error("Error receiving questionnaires:", error);
      heroSection.innerHTML = "<p>Error loading questionnaires.</p>";
    }
  }

  fetchQuestionnaires();

  function setupPagination(totalPages, currentPage) {
    const paginationContainer = document.getElementById("pagination-container");
    paginationContainer.innerHTML = "";

    if (!totalPages || totalPages <= 1) return;

    for (let i = 1; i <= totalPages; i++) {
      const pageButton = document.createElement("button");
      pageButton.textContent = i;
      pageButton.classList.add("pagination-button");

      if (i === currentPage) {
        pageButton.classList.add("active");
      }

      pageButton.addEventListener("click", () => {
        fetchQuestionnaires(i);
      });

      paginationContainer.appendChild(pageButton);
    }
  }

  function attachMenuEventListeners() {
    document.querySelectorAll(".menu-icon").forEach((icon) => {
      icon.addEventListener("click", function (event) {
        event.stopPropagation();

        let menuId = this.getAttribute("data-menu");
        let menu = document.getElementById(menuId);

        document.querySelectorAll(".dropdown-menu").forEach((m) => {
          if (m !== menu) {
            m.classList.remove("menu-visible");
          }
        });

        menu.classList.toggle("menu-visible");
      });
    });

    document.addEventListener("click", function () {
      document.querySelectorAll(".dropdown-menu").forEach((menu) => {
        menu.classList.remove("menu-visible");
      });
    });

    document.querySelectorAll(".dropdown-menu ul").forEach((menuList) => {
      menuList.addEventListener("click", function (event) {
        const target = event.target;
        if (target.tagName === "LI") {
          const action = target.getAttribute("data-action");
          const questionnaireId = target.getAttribute("data-id");

          if (action === "edit") {
            window.location.href = `edit-questionnaire.html?id=${questionnaireId}`;
          } else if (action === "run") {
            window.location.href = `run-questionnaire.html?id=${questionnaireId}`;
          } else if (action === "delete") {
            handleDeleteQuestionnaire(questionnaireId);
          }
        }
      });
    });
  }

  function attachMenuEventListeners() {
    document.querySelectorAll(".menu-icon").forEach((icon) => {
      icon.addEventListener("click", function (event) {
        event.stopPropagation();

        let menuId = this.getAttribute("data-menu");
        let menu = document.getElementById(menuId);

        document.querySelectorAll(".dropdown-menu").forEach((m) => {
          if (m !== menu) {
            m.classList.remove("menu-visible");
          }
        });

        menu.classList.toggle("menu-visible");
      });
    });

    document.addEventListener("click", function () {
      document.querySelectorAll(".dropdown-menu").forEach((menu) => {
        menu.classList.remove("menu-visible");
      });
    });

    document.querySelectorAll(".dropdown-menu ul").forEach((menuList) => {
      const questionnaireCard = menuList.closest(".quiz-container");
      const questionnaireId =
        questionnaireCard.querySelector(".quiz-card").dataset.questionnaireId;

      menuList.addEventListener("click", function (event) {
        const target = event.target;

        if (target.tagName === "LI") {
          const action = target.textContent;
          const questionnaireCard = target.closest(".quiz-container");

          if (action === "Edit") {
            const editUrl = `edit-questionnaire.html?id=${questionnaireId}`;
            window.location.href = editUrl;
          } else if (action === "Run") {
            const runUrl = `run-questionnaire.html?id=${questionnaireId}`;
            window.location.href = runUrl;
          } else if (action === "Delete") {
            handleDeleteQuestionnaire(questionnaireId, questionnaireCard);
          }

          menuList.closest(".dropdown-menu").classList.remove("menu-visible");
        }
      });
    });
  }

  function handleDeleteQuestionnaire(questionnaireId, questionnaireCard) {
    if (confirm("Are you sure you want to delete this questionnaire?")) {
      fetch(`${API_URL}/api/questionnaires/${questionnaireId}`, {
        method: "DELETE",
      })
        .then((response) => {
          if (response.ok) {
            console.log(
              `Questionnaire ID ${questionnaireId} deleted successfully.`
            );
            questionnaireCard.remove();
          } else {
            console.error("Failed to delete questionnaire.");
            alert("Error deleting a questionnaire.");
          }
        })
        .catch((error) => {
          console.error("Error deleting questionnaire:", error);
          alert("Error deleting a questionnaire.");
        });
    }
  }
});
