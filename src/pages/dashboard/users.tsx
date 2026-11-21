import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, getErrorMessage } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import type { PaginatedResponse, User, UserRole, Team } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Users,
  UserPlus,
  Search,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Shield,
  AlertTriangle,
  Loader2,
  Mail,
} from "lucide-react";

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  // Invite modal state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<UserRole>("EMPLOYEE");
  const [inviteTeamId, setInviteTeamId] = useState<number | "">("");

  // Deactivate confirmation state
  const [deactivatingUserId, setDeactivatingUserId] = useState<number | null>(null);

  // Users query
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["users", { page, search, roleFilter }],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedResponse<User>>("/users", {
        params: {
          page,
          limit: 15,
          search: search.trim() || undefined,
          role: roleFilter === "ALL" ? undefined : roleFilter,
        },
      });
      return res.data;
    },
  });

  // Teams query for the invite dialog
  const { data: teamsData } = useQuery({
    queryKey: ["teams-for-invite"],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedResponse<Team>>("/teams", {
        params: { limit: 100 },
      });
      return res.data;
    },
    enabled: isInviteModalOpen,
  });

  // Invite user mutation
  const inviteMutation = useMutation({
    mutationFn: async (payload: {
      email: string;
      role?: UserRole;
      teamId?: number;
    }) => {
      const res = await apiClient.post("/users/invite", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Invitation Sent!", {
        description: `An onboarding invitation has been dispatched to ${inviteEmail}.`,
      });
      setIsInviteModalOpen(false);
      setInviteEmail("");
      setInviteTeamId("");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (err) => {
      toast.error("Failed to Send Invite", {
        description: getErrorMessage(err),
      });
    },
  });

  // Deactivate user mutation
  const deactivateMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiClient.delete(`/users/${userId}`);
    },
    onSuccess: () => {
      toast.success("User Deactivated", {
        description: "The user account has been soft-deleted and all sessions revoked.",
      });
      setDeactivatingUserId(null);
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    },
    onError: (err) => {
      toast.error("Deactivation Blocked", {
        description: getErrorMessage(err),
      });
      setDeactivatingUserId(null);
    },
  });

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) {
      toast.error("Email is required");
      return;
    }
    inviteMutation.mutate({
      email: inviteEmail.trim(),
      role: inviteRole,
      teamId: inviteTeamId ? Number(inviteTeamId) : undefined,
    });
  };

  const users = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="space-y-6 animate-in fade-in-50">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Users className="size-6 text-primary" /> User Administration
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage registered platform users, generate email invitations, and supervise roles.
          </p>
        </div>

        <Button
          onClick={() => setIsInviteModalOpen(true)}
          className="gap-2 cursor-pointer shrink-0"
        >
          <UserPlus className="size-4" /> Invite User
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground pointer-events-none" />
          <Input
            type="search"
            placeholder="Search users by name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9 bg-card"
          />
        </div>

        <div className="flex items-center gap-1">
          {(["ALL", "ADMIN", "EMPLOYEE"] as const).map((r) => (
            <Button
              key={r}
              size="sm"
              variant={roleFilter === r ? "default" : "outline"}
              onClick={() => {
                setRoleFilter(r);
                setPage(1);
              }}
              className="text-xs h-9 cursor-pointer"
            >
              {r === "ALL" ? "All Roles" : r}
            </Button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Registered Users</CardTitle>
          <CardDescription>
            Platform accounts and organizational assignments
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded" />
              ))}
            </div>
          ) : isError ? (
            <div className="p-8 text-center text-destructive space-y-2">
              <AlertTriangle className="size-8 mx-auto" />
              <p className="text-sm font-medium">Failed to load users</p>
              <p className="text-xs text-muted-foreground">{getErrorMessage(error)}</p>
            </div>
          ) : users.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<Users className="size-6" />}
                title="No users found"
                description={
                  search || roleFilter !== "ALL"
                    ? "No users match your active search filters."
                    : "No users currently registered."
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider border-b border-border">
                  <tr>
                    <th className="py-3 px-4 font-semibold">User</th>
                    <th className="py-3 px-4 font-semibold">Email</th>
                    <th className="py-3 px-4 font-semibold">Global Role</th>
                    <th className="py-3 px-4 font-semibold">Team Assignment</th>
                    <th className="py-3 px-4 font-semibold">Joined Date</th>
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {users.map((u) => {
                    const isSelf = u.userId === currentUser?.userId;

                    return (
                      <tr
                        key={u.userId}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <td className="py-3 px-4 font-medium text-foreground">
                          <div className="flex items-center gap-2.5">
                            <div className="size-7 rounded-full bg-primary/10 text-primary font-semibold text-xs flex items-center justify-center">
                              {u.name.slice(0, 2).toUpperCase()}
                            </div>
                            <span>{u.name}</span>
                            {isSelf && (
                              <Badge variant="outline" className="text-[10px] py-0 px-1">
                                You
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {u.email}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={u.role === "ADMIN" ? "purple" : "secondary"}
                            className="text-xs"
                          >
                            {u.role === "ADMIN" && (
                              <Shield className="size-3 mr-1" />
                            )}
                            {u.role}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          {u.membership ? (
                            <div className="flex items-center gap-1.5 text-xs text-foreground font-medium">
                              <span>Team #{u.membership.teamId}</span>
                              <Badge variant="outline" className="text-[10px] py-0 font-normal">
                                {u.membership.role}
                              </Badge>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">
                              None
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {!isSelf && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeactivatingUserId(u.userId)}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs gap-1"
                              title="Deactivate User"
                            >
                              <Trash2 className="size-3.5" /> Deactivate
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {meta && meta.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-border text-xs text-muted-foreground">
              <span>
                Showing page <strong>{meta.page}</strong> of <strong>{meta.totalPages}</strong> ({meta.total} users)
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="size-4" /> Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
                  disabled={page >= meta.totalPages}
                >
                  Next <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite User Modal */}
      <Dialog open={isInviteModalOpen} onOpenChange={setIsInviteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite New User</DialogTitle>
            <DialogDescription>
              Generate an onboarding invitation token sent to the user's email address.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleInviteSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <label htmlFor="inviteEmailInput" className="text-sm font-medium">
                Email Address <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
                <Input
                  id="inviteEmailInput"
                  type="email"
                  placeholder="new.user@intraflow.dev"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="inviteRoleSelect" className="text-sm font-medium">
                Global Platform Role
              </label>
              <select
                id="inviteRoleSelect"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as UserRole)}
                className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm"
              >
                <option value="EMPLOYEE">EMPLOYEE (Standard Operational User)</option>
                <option value="ADMIN">ADMIN (Platform Administrator)</option>
              </select>
            </div>

            {inviteRole === "EMPLOYEE" && (
              <div className="space-y-2">
                <label htmlFor="inviteTeamSelect" className="text-sm font-medium">
                  Pre-assign Team (Optional)
                </label>
                <select
                  id="inviteTeamSelect"
                  value={inviteTeamId}
                  onChange={(e) =>
                    setInviteTeamId(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm"
                >
                  <option value="">-- No team assignment --</option>
                  {(teamsData?.data || []).map((t) => (
                    <option key={t.teamId} value={t.teamId}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsInviteModalOpen(false)}
                disabled={inviteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={inviteMutation.isPending || !inviteEmail.trim()}
                className="gap-2"
              >
                {inviteMutation.isPending && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Send Invitation
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Deactivate User Dialog */}
      <Dialog
        open={deactivatingUserId !== null}
        onOpenChange={(open) => !open && setDeactivatingUserId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="size-5" /> Deactivate User Account
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to deactivate this user? Their active sessions will be terminated immediately. Note: Backend policy prevents deleting yourself or the last remaining administrator.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeactivatingUserId(null)}
              disabled={deactivateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deactivatingUserId && deactivateMutation.mutate(deactivatingUserId)}
              disabled={deactivateMutation.isPending}
              className="gap-2"
            >
              {deactivateMutation.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Confirm Deactivation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
