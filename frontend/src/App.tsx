import { LanguageProvider } from "./context/LanguageContext";
import AppRoutes from "./routes/AppRoutes";

function App() {
  return (
    <LanguageProvider>
      <AppRoutes />
    </LanguageProvider>
  );
}

export default App;