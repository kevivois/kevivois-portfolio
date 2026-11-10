import React from "react";
import { createRoot } from "react-dom/client";
import { MantineProvider } from "@mantine/core";
import "@mantine/core/styles.css";
import App from "./App.jsx";
import "./style.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <MantineProvider
      defaultColorScheme="light"
      theme={{
        primaryColor: "green",
        colors: {
          green: [
            "#eef5f0",
            "#d9e8dd",
            "#bed7c6",
            "#9dc2ab",
            "#7eac90",
            "#63987a",
            "#4d8266",
            "#3b6b53",
            "#2e5944",
            "#234434",
          ],
        },
        fontFamily: 'Inter, "Segoe UI", Arial, sans-serif',
        headings: { fontFamily: '"Space Grotesk", "Segoe UI", Arial, sans-serif' },
        defaultRadius: 2,
      }}
    >
      <App />
    </MantineProvider>
  </React.StrictMode>,
);
