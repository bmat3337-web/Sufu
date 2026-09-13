import { useEffect } from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import BottomNav from "./components/BottomNav";
import AuthModal from "./components/AuthModal";
import { ToastProvider } from "./components/Toast";
import { AuthProvider } from "./lib/auth";
import { useRoute } from "./router";
import HomePage from "./pages/HomePage";
import ExplorePage from "./pages/ExplorePage";
import PostPage from "./pages/PostPage";
import InboxPage from "./pages/InboxPage";
import ThreadPage from "./pages/ThreadPage";
import ProfilePage from "./pages/ProfilePage";
import ProviderPage from "./pages/ProviderPage";
import ListingPage from "./pages/ListingPage";

function Page({ path }: { path: string }) {
  if (path.startsWith("/explore")) return <ExplorePage />;
  if (path.startsWith("/provider/")) return <ProviderPage id={path.slice("/provider/".length)} />;
  if (path.startsWith("/listing/")) return <ListingPage id={path.slice("/listing/".length)} />;
  if (path.startsWith("/post")) return <PostPage />;
  if (path.startsWith("/inbox/")) return <ThreadPage id={path.slice("/inbox/".length)} />;
  if (path.startsWith("/inbox")) return <InboxPage />;
  if (path.startsWith("/profile")) return <ProfilePage />;
  // "/" and legacy section anchors (#how-it-works, #contact, #sell, #categories, #top)
  return <HomePage />;
}

export default function App() {
  const { path } = useRoute();
  const isRoute = path.startsWith("/");

  useEffect(() => {
    if (isRoute) {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    } else {
      const target = document.getElementById(path);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [path, isRoute]);

  return (
    <AuthProvider>
      <ToastProvider>
        <div id="top" className="min-h-screen bg-background font-sans text-foreground">
          <Header />
          <main id="main-content" className="pb-24 md:pb-0">
            <Page path={path} />
          </main>
          <Footer />
          <BottomNav path={path} />
        </div>
        <AuthModal />
      </ToastProvider>
    </AuthProvider>
  );
}
