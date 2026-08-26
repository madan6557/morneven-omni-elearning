import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { ThemeProvider } from "./context/ThemeContext";
import { FeedbackProvider } from "./context/FeedbackContext";
ReactDOM.createRoot(document.getElementById("root")!).render(<React.StrictMode><ThemeProvider><FeedbackProvider><App/></FeedbackProvider></ThemeProvider></React.StrictMode>);
