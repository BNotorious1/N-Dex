import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import Leagues from "@/pages/Leagues";
import LeagueDetail from "@/pages/LeagueDetail";
import NewLeague from "@/pages/NewLeague";
import TeamDetail from "@/pages/TeamDetail";
import PlayerDetail from "@/pages/PlayerDetail";
import GameDetail from "@/pages/GameDetail";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30000,
    },
  },
});

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/leagues" component={Leagues} />
      <Route path="/leagues/new" component={NewLeague} />
      <Route path="/leagues/:id" component={LeagueDetail} />
      <Route path="/teams/:id" component={TeamDetail} />
      <Route path="/players/:id" component={PlayerDetail} />
      <Route path="/games/:id" component={GameDetail} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
