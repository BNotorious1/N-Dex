import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useCreateLeague, getListLeaguesQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";

const schema = z.object({
  name: z.string().min(1, "League name is required"),
  platform: z.string().min(1),
  difficulty: z.string().min(1),
  category: z.string().min(1),
  skill_level: z.string().min(1),
  advance_time_hours: z.coerce.number().min(1).max(168),
  max_members: z.coerce.number().min(2).max(32),
  is_cross_play: z.boolean().default(false),
  is_money_league: z.boolean().default(false),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export default function NewLeague() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const createLeague = useCreateLeague();
  const { user, loading, login } = useAuth();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      platform: "PS5",
      difficulty: "ALL_MADDEN",
      category: "REGULAR",
      skill_level: "INTERMEDIATE",
      advance_time_hours: 48,
      max_members: 32,
      is_cross_play: false,
      is_money_league: false,
      description: "",
    },
  });

  const onSubmit = (values: FormValues) => {
    createLeague.mutate(
      { data: values },
      {
        onSuccess: (league) => {
          queryClient.invalidateQueries({ queryKey: getListLeaguesQueryKey() });
          setLocation(`/leagues/${league.id}`);
        },
      }
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="h-6 w-48 bg-white/5 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <p className="text-white/60 text-sm">You must be logged in to create a league.</p>
            <button
              onClick={login}
              className="inline-flex items-center gap-2 rounded-xl bg-[#5865F2] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#4752C4] transition-colors"
            >
              Login with Discord
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      <Navbar />

      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-black uppercase tracking-tight">Create League</h1>
          <p className="text-xs text-white/40 mt-1">Set up your Madden franchise league</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div className="rounded-xl border border-white/10 bg-[#141414] p-6 space-y-5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-white/40">League Info</h2>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-white/60 uppercase tracking-wider">League Name</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="My Franchise League"
                        className="bg-white/5 border-white/10 text-white placeholder:text-white/20 focus:border-[#00C8FF]/40"
                        data-testid="input-league-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-1.5">
                <p className="text-xs text-white/60 uppercase tracking-wider font-medium">Commissioner</p>
                <div className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 py-2">
                  {user.avatar && (
                    <img src={user.avatar} alt="" className="h-5 w-5 rounded-full" />
                  )}
                  <span className="text-sm text-white">{user.username}</span>
                  <span className="ml-auto text-[10px] text-white/30 uppercase tracking-wider">You</span>
                </div>
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs text-white/60 uppercase tracking-wider">Description (optional)</FormLabel>
                    <FormControl>
                      <textarea
                        {...field}
                        placeholder="Tell people about your league..."
                        rows={3}
                        className="w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/20 focus:border-[#00C8FF]/40 focus:outline-none resize-none"
                        data-testid="input-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="rounded-xl border border-white/10 bg-[#141414] p-6 space-y-5">
              <h2 className="text-xs font-bold uppercase tracking-wider text-white/40">Settings</h2>

              <div className="grid sm:grid-cols-2 gap-4">
                <SelectField form={form} name="platform" label="Platform" options={[
                  { value: "PS5", label: "PlayStation 5" },
                  { value: "Xbox", label: "Xbox" },
                  { value: "PC", label: "PC" },
                ]} />
                <SelectField form={form} name="difficulty" label="Difficulty" options={[
                  { value: "ALL_MADDEN", label: "All-Madden" },
                  { value: "ALL_PRO", label: "All-Pro" },
                  { value: "PRO", label: "Pro" },
                  { value: "ROOKIE", label: "Rookie" },
                ]} />
                <SelectField form={form} name="category" label="Category" options={[
                  { value: "REGULAR", label: "Regular" },
                  { value: "FANTASY", label: "Fantasy" },
                ]} />
                <SelectField form={form} name="skill_level" label="Skill Level" options={[
                  { value: "BEGINNER", label: "Beginner" },
                  { value: "INTERMEDIATE", label: "Intermediate" },
                  { value: "ADVANCED", label: "Advanced" },
                ]} />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="advance_time_hours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-white/60 uppercase tracking-wider">Advance Time (hours)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min={1}
                          max={168}
                          className="bg-white/5 border-white/10 text-white focus:border-[#00C8FF]/40"
                          data-testid="input-advance-time"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="max_members"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-white/60 uppercase tracking-wider">Max Members</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="number"
                          min={2}
                          max={32}
                          className="bg-white/5 border-white/10 text-white focus:border-[#00C8FF]/40"
                          data-testid="input-max-members"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-3 pt-2">
                <ToggleSwitchField form={form} name="is_cross_play" label="Cross Play Enabled" />
                <ToggleSwitchField form={form} name="is_money_league" label="Money League" />
              </div>
            </div>

            <button
              type="submit"
              disabled={createLeague.isPending}
              className="w-full rounded-xl bg-[#00C8FF] py-3 text-sm font-bold uppercase tracking-wider text-black hover:bg-[#00b3e0] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(0,200,255,0.2)]"
              data-testid="button-submit"
            >
              {createLeague.isPending ? "Creating..." : "Create League"}
            </button>
          </form>
        </Form>
      </div>
    </div>
  );
}

function SelectField({
  form,
  name,
  label,
  options,
}: {
  form: ReturnType<typeof useForm<any>>;
  name: string;
  label: string;
  options: { value: string; label: string }[];
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }: any) => (
        <FormItem>
          <FormLabel className="text-xs text-white/60 uppercase tracking-wider">{label}</FormLabel>
          <Select onValueChange={field.onChange} value={field.value}>
            <FormControl>
              <SelectTrigger className="bg-white/5 border-white/10 text-white" data-testid={`select-${name}`}>
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent className="bg-[#1a1a1a] border-white/10">
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value} className="text-white hover:bg-white/10">
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

function ToggleSwitchField({
  form,
  name,
  label,
}: {
  form: ReturnType<typeof useForm<any>>;
  name: string;
  label: string;
}) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }: any) => (
        <FormItem className="flex items-center justify-between">
          <FormLabel className="text-xs text-white/60 cursor-pointer">{label}</FormLabel>
          <FormControl>
            <Switch
              checked={field.value}
              onCheckedChange={field.onChange}
              data-testid={`switch-${name}`}
            />
          </FormControl>
        </FormItem>
      )}
    />
  );
}
