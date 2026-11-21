import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient, getErrorMessage } from "@/lib/api-client";
import type { Team, User, TeamMemberRole, PaginatedResponse } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { Users, UserPlus, UserMinus, Shield, Loader2, AlertCircle } from "lucide-react";

interface TeamRosterProps {
  team: Team;
  canManageMembers: boolean;
  canEditRoles: boolean;
}

export function TeamRoster({
  team,
  canManageMembers,
  canEditRoles,
}: TeamRosterProps) {
  const queryClient = useQueryClient();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | "">("");
  const [selectedRole, setSelectedRole] = useState<TeamMemberRole>("MEMBER");
  const [removingMemberId, setRemovingMemberId] = useState<number | null>(null);

  // Available users query for adding to roster (Employees only, Admin only)
  const { data: usersData, isLoading: isUsersLoading } = useQuery({
    queryKey: ["available-users-for-team", team.teamId],
    queryFn: async () => {
      const res = await apiClient.get<PaginatedResponse<User>>("/users", {
        params: { limit: 100, role: "EMPLOYEE" },
      });
      return res.data;
    },
    enabled: isAddModalOpen && canEditRoles,
  });

  // Filter users who do not already belong to this team
  const availableUsers = (usersData?.data || []).filter(
    (u) => !team.members?.some((m) => m.userId === u.userId)
  );

  // Add member mutation
  const addMemberMutation = useMutation({
    mutationFn: async (payload: { userId: number; role: TeamMemberRole }) => {
      await apiClient.post(`/teams/${team.teamId}/members`, payload);
    },
    onSuccess: () => {
      toast.success("Member Added", {
        description: "User has been added to the team roster.",
      });
      setIsAddModalOpen(false);
      setSelectedUserId("");
      setSelectedRole("MEMBER");
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["team", team.teamId] });
      queryClient.invalidateQueries({ queryKey: ["my-team"] });
    },
    onError: (err) => {
      toast.error("Failed to Add Member", {
        description: getErrorMessage(err),
      });
    },
  });

  // Update member role mutation (Admin only)
  const updateRoleMutation = useMutation({
    mutationFn: async ({
      userId,
      role,
    }: {
      userId: number;
      role: TeamMemberRole;
    }) => {
      await apiClient.patch(`/teams/${team.teamId}/members/${userId}`, { role });
    },
    onSuccess: () => {
      toast.success("Role Updated", {
        description: "Team membership role has been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["team", team.teamId] });
      queryClient.invalidateQueries({ queryKey: ["my-team"] });
    },
    onError: (err) => {
      toast.error("Failed to Update Role", {
        description: getErrorMessage(err),
      });
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (userId: number) => {
      await apiClient.delete(`/teams/${team.teamId}/members/${userId}`);
    },
    onSuccess: () => {
      toast.success("Member Removed", {
        description:
          "User removed from team. Open tasks were returned to unassigned queue.",
      });
      setRemovingMemberId(null);
      queryClient.invalidateQueries({ queryKey: ["teams"] });
      queryClient.invalidateQueries({ queryKey: ["team", team.teamId] });
      queryClient.invalidateQueries({ queryKey: ["my-team"] });
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    },
    onError: (err) => {
      toast.error("Failed to Remove Member", {
        description: getErrorMessage(err),
      });
      setRemovingMemberId(null);
    },
  });

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      toast.error("Please select a user to add");
      return;
    }
    addMemberMutation.mutate({
      userId: Number(selectedUserId),
      role: selectedRole,
    });
  };

  const members = team.members || [];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-base font-semibold">Team Roster</CardTitle>
          <CardDescription>
            {members.length} {members.length === 1 ? "member" : "members"} assigned to {team.name}
          </CardDescription>
        </div>

        {canEditRoles && (
          <Button
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            className="gap-2 cursor-pointer"
          >
            <UserPlus className="size-4" /> Add Member
          </Button>
        )}
      </CardHeader>

      <CardContent className="p-0">
        {members.length === 0 ? (
          <div className="p-8">
            <EmptyState
              icon={<Users className="size-6" />}
              title="No members in team"
              description="This team does not currently have any members. Add members to assign projects and tasks."
              action={
                canEditRoles ? (
                  <Button
                    size="sm"
                    onClick={() => setIsAddModalOpen(true)}
                    className="gap-2"
                  >
                    <UserPlus className="size-4" /> Add Member
                  </Button>
                ) : undefined
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider border-b border-border">
                <tr>
                  <th className="py-3 px-4 font-semibold">Member</th>
                  <th className="py-3 px-4 font-semibold">System Role</th>
                  <th className="py-3 px-4 font-semibold">Team Role</th>
                  <th className="py-3 px-4 font-semibold">Joined</th>
                  {canManageMembers && (
                    <th className="py-3 px-4 font-semibold text-right">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {members.map((member) => {
                  const memberName =
                    member.user?.name || member.name || `User #${member.userId}`;
                  const memberSubtitle = member.email || member.user?.role || "Employee";
                  const memberDate = member.createdAt || member.joinedAt;

                  return (
                    <tr key={member.userId} className="hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-4 font-medium text-foreground">
                        <div className="flex items-center gap-2.5">
                          <div className="size-7 rounded-full bg-primary/10 text-primary font-semibold text-xs flex items-center justify-center">
                            {memberName.slice(0, 2).toUpperCase()}
                          </div>
                          <span>{memberName}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">
                        {memberSubtitle}
                      </td>
                      <td className="py-3 px-4">
                        {canEditRoles ? (
                          <select
                            value={member.role}
                            onChange={(e) =>
                              updateRoleMutation.mutate({
                                userId: member.userId,
                                role: e.target.value as TeamMemberRole,
                              })
                            }
                            className="text-xs bg-muted/60 border border-border rounded px-2 py-1 font-medium text-foreground cursor-pointer"
                          >
                            <option value="MEMBER">MEMBER</option>
                            <option value="MODERATOR">MODERATOR</option>
                          </select>
                        ) : (
                          <Badge
                            variant={member.role === "MODERATOR" ? "purple" : "secondary"}
                            className="text-xs"
                          >
                            {member.role === "MODERATOR" && (
                              <Shield className="size-3 mr-1" />
                            )}
                            {member.role}
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">
                        {memberDate ? new Date(memberDate).toLocaleDateString() : "—"}
                      </td>
                      {canManageMembers && (canEditRoles || member.role === "MEMBER") && (
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setRemovingMemberId(member.userId)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1 text-xs"
                            title="Remove from team"
                          >
                            <UserMinus className="size-3.5" /> Remove
                          </Button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      {/* Add Member Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Member to {team.name}</DialogTitle>
            <DialogDescription>
              Select an employee to add to this team's roster. Employees can belong to at most one team.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <label htmlFor="userSelect" className="text-sm font-medium">
                Select Employee
              </label>
              {isUsersLoading ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                  <Loader2 className="size-4 animate-spin" /> Loading employees...
                </div>
              ) : availableUsers.length === 0 ? (
                <div className="p-3 bg-muted/50 rounded text-xs text-muted-foreground flex items-center gap-2">
                  <AlertCircle className="size-4 text-amber-500 shrink-0" />
                  No unassigned employees available to add.
                </div>
              ) : (
                <select
                  id="userSelect"
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(Number(e.target.value))}
                  className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm"
                  required
                >
                  <option value="">-- Choose employee --</option>
                  {availableUsers.map((u) => (
                    <option key={u.userId} value={u.userId}>
                      {u.name} ({u.email})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {canEditRoles && (
              <div className="space-y-2">
                <label htmlFor="roleSelect" className="text-sm font-medium">
                  Team Role
                </label>
                <select
                  id="roleSelect"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as TeamMemberRole)}
                  className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm"
                >
                  <option value="MEMBER">MEMBER (Standard Task Contributor)</option>
                  <option value="MODERATOR">MODERATOR (Team Reviewer & Lead)</option>
                </select>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddModalOpen(false)}
                disabled={addMemberMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={addMemberMutation.isPending || !selectedUserId}
                className="gap-2"
              >
                {addMemberMutation.isPending && (
                  <Loader2 className="size-4 animate-spin" />
                )}
                Add to Roster
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirm Member Removal Dialog */}
      <Dialog
        open={removingMemberId !== null}
        onOpenChange={(open) => !open && setRemovingMemberId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <UserMinus className="size-5" /> Remove Team Member
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this member? Any open (non-completed) tasks assigned to this user will be reset to UNASSIGNED, and an automated audit comment will be recorded.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRemovingMemberId(null)}
              disabled={removeMemberMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => removingMemberId && removeMemberMutation.mutate(removingMemberId)}
              disabled={removeMemberMutation.isPending}
              className="gap-2"
            >
              {removeMemberMutation.isPending && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Confirm Removal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
