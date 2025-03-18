# Qniverse - Questionnaire Builder - level Base

**Qniverse** is a web application that allows users to create their own questionnaires (quizzes) with various question types: text input, single choice, and multiple choice. Once created, questionnaires are stored in a database and can be run for users to take, edited, and deleted.

## Technologies

The Qniverse project is built using the following technologies:

**Frontend:**

*   **HTML:** For structuring web pages.
*   **CSS:** For styling the user interface.
*   **JavaScript:** For client-side interactivity and dynamic logic.
*   **htmx:** For enhancing interactivity and server communication (though not actively used in the current version).

**Backend:**

*   **Node.js:** JavaScript runtime environment for the server-side.
*   **Express:** Node.js framework for building web applications and APIs.
*   **PostgreSQL:** Relational database for storing questionnaires and user responses.
*   **pg (node-postgres):** Node.js driver for connecting to PostgreSQL.

## Instructions to Run

To run the Qniverse project on your local machine, follow these steps:

### Prerequisites

Before you begin, ensure you have the following software installed on your computer:

*   **Node.js** (with npm - Node.js package manager) - [Download Node.js](https://nodejs.org/)
*   **PostgreSQL** - [Download PostgreSQL](https://www.postgresql.org/download/)
*   **pgAdmin** (optional, but recommended) - [Download pgAdmin](https://www.pgadmin.org/download/) - a graphical interface for PostgreSQL management.

### Installation

1.  **Clone the Qniverse repository from GitHub:**

    ```bash
    git clone <your_repository_address>
    cd Qniverse
    ```

2.  **Navigate to the `backend` folder and install backend dependencies:**

    ```bash
    cd backend
    npm install
    ```

3.  **Create a PostgreSQL database named `questionnaire_db`:**

    *   Launch pgAdmin (or use the `psql` command-line tool).
    *   Create a new database named `questionnaire_db`.

4.  **Create tables in the `questionnaire_db` database:**

    *   Open the Query Tool for the `questionnaire_db` database in pgAdmin (or use `psql`).
    *   Execute the SQL code to create tables (copy and paste the following code into the Query Tool and execute):

    ```sql
    CREATE TABLE questionnaires (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT
    );

    CREATE TABLE questions (
        id SERIAL PRIMARY KEY,
        questionnaire_id INTEGER REFERENCES questionnaires(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        type VARCHAR(50) NOT NULL -- 'text', 'single-choice', 'multiple-choice'
    );

    CREATE TABLE answers (
        id SERIAL PRIMARY KEY,
        question_id INTEGER REFERENCES questions(id),
        text TEXT NOT NULL
    );

    CREATE TABLE correct_answers (
        id SERIAL PRIMARY KEY,
        question_id INTEGER REFERENCES questions(id) ON DELETE CASCADE,
        text TEXT NOT NULL
    );

    CREATE TABLE user_responses (
        id SERIAL PRIMARY KEY,
        questionnaire_id INTEGER REFERENCES questionnaires(id),
        question_id INTEGER REFERENCES questions(id),
        user_answer TEXT,
        completion_time TIMESTAMP -- Додамо поле для часу завершення опитування
    );
    ```

5.  **Configure database connection in `backend/server.js`:**

    *   Open the `backend/server.js` file in a text editor.
    *   Locate the `Pool` configuration block (PostgreSQL connection):

    ```javascript
    const pool = new Pool({
        user: 'postgres', // Replace with your PostgreSQL user if needed
        host: 'localhost',
        database: 'questionnaire_db', // Your database name
        password: 'your_password', // Replace with your postgres password
        port: 5432,
    });
    ```

    *   **Replace the values for `user`, `password`, and `database` with your own PostgreSQL settings**, if they differ from the defaults. **It is crucial to correctly specify the password you set for the `postgres` user (or another PostgreSQL user).**

### Running the Application

1.  **Start the backend server:**

    *   Open a command prompt or terminal.
    *   Navigate to the `backend` folder: `cd Qniverse/backend`.
    *   Run the server using the command: `node server.js`.
    *   You should see a message in the console: `Backend server listening at http://localhost:3000`.

2.  **Open the frontend in your browser:**

    *   Open your web browser (e.g., Chrome, Firefox, Safari).
    *   Enter the file path to the `index.html` file on your computer in the address bar. **The easiest way is to open the `index.html` file directly through your browser:**
        *   Locate the `index.html` file in the `Qniverse` folder using your file explorer.
        *   Drag and drop the `index.html` file into the browser window or right-click on the `index.html` file and select "Open With" and choose your browser.

    *   The Qniverse homepage should open in your browser.

## Usage

**Creating a Questionnaire:**

1.  On the homepage, click the "Create new questionnaire" button.
2.  On the "Create Questionnaire" page, enter the title and description of the questionnaire.
3.  Add questions by clicking the "Add question" button.
4.  For each question:
    *   Enter the question text.
    *   Select the question type (Text, Single choice, Multiple choice).
    *   For choice-based questions:
        *   Add answer options by clicking "Add option".
        *   Mark the correct answer options using the radio buttons (for single choice) or checkboxes (for multiple choice) labeled "Correct Answer:".
    *   For text-based questions:
        *   Enter the correct answer in the "Correct Answer:" field.
5.  Click the "Save Questionnaire" button to store the created questionnaire in the database.

**Viewing and Taking Questionnaires:**

*   The homepage displays a list of created questionnaires.
*   **Run:** Click "Run" in the dropdown menu next to a questionnaire to take the quiz. Answer the questions and click "Submit Questionnaire" on the last question to see your results.
*   **Edit:** Click "Edit" in the dropdown menu to edit an existing questionnaire.
*   **Delete:** Click "Delete" in the dropdown menu to delete a questionnaire (you will need to confirm deletion).

**Thank you for using Qniverse!**
