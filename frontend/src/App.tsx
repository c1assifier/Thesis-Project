import { Route, Routes } from "react-router-dom";

import Layout from "./components/Layout";
import CoursePage from "./pages/CoursePage";
import DiagnosticPage from "./pages/DiagnosticPage";
import DiagnosticResultPage from "./pages/DiagnosticResultPage";
import ExercisePage from "./pages/ExercisePage";
import ExerciseRedirectPage from "./pages/ExerciseRedirectPage";
import HomePage from "./pages/HomePage";
import LessonPage from "./pages/LessonPage";
import LearningModulePage from "./pages/LearningModulePage";
import ModulePage from "./pages/ModulePage";

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <Layout>
            <HomePage />
          </Layout>
        }
      />
      <Route
        path="/course"
        element={
          <Layout>
            <CoursePage />
          </Layout>
        }
      />
      <Route
        path="/diagnostic"
        element={
          <Layout>
            <DiagnosticPage />
          </Layout>
        }
      />
      <Route
        path="/diagnostic/result"
        element={
          <Layout>
            <DiagnosticResultPage />
          </Layout>
        }
      />
      <Route
        path="/courses/:courseId/modules/:moduleId"
        element={
          <Layout>
            <LearningModulePage />
          </Layout>
        }
      />
      <Route
        path="/modules/:moduleId"
        element={
          <Layout>
            <ModulePage />
          </Layout>
        }
      />
      <Route
        path="/courses/:courseId/modules/:moduleId/lessons/:lessonId"
        element={
          <Layout>
            <LessonPage />
          </Layout>
        }
      />
      <Route
        path="/courses/:courseId/modules/:moduleId/lessons/:lessonId/exercises/:exerciseId"
        element={
          <Layout>
            <ExercisePage />
          </Layout>
        }
      />
      <Route
        path="/exercise/:exerciseId"
        element={
          <Layout>
            <ExerciseRedirectPage />
          </Layout>
        }
      />
    </Routes>
  );
}
