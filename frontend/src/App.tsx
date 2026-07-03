import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import DashboardPage from "./pages/DashboardPage";
import ComparePage from "./pages/ComparePage";
import ProductDetailPage from "./pages/ProductDetailPage";

function App() {
  return (
    <BrowserRouter>
      <Navbar></Navbar>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/product/:modelNumber" element={<ProductDetailPage />} />
        <Route path="/compare" element={<ComparePage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
