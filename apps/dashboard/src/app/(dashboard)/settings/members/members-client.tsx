"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  Link2,
  Loader2,
  MailPlus,
  Shield,
  UserMinus,
  UserRound,
} from "lucide-react";
import { toast } from "sonner";
import {
  createOrganizationInvitation,
  deactivateOrganizationMember,
  getOrganizationMembers,
  type OrganizationMemberPayload,
  updateOrganizationInvitation,
  updateOrganizationMember,
} from "@/lib/api-client";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Member = OrganizationMemberPayload["members"][0];
type Invitation = OrganizationMemberPayload["invitations"][0];

const ROLE_LABEL: Record<Member["role"], string> = {
  admin: "Owner",
  manager: "Manager",
};

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString();
}

export function MembersClient() {
  const [loading, setLoading] = useState(true);
  const [accessDenied, setAccessDenied] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Member["role"]>("manager");
  const [isPending, startTransition] = useTransition();

  const ownerCount = useMemo(
    () => members.filter((member) => member.role === "admin" && member.is_active).length,
    [members]
  );

  const loadDirectory = useCallback(async () => {
    try {
      setLoading(true);
      setAccessDenied(false);
      const data = await getOrganizationMembers();
      setCurrentUserId(data.currentUserId);
      setMembers(data.members);
      setInvitations(data.invitations);
    } catch (error) {
      if (error instanceof Error && "status" in error && (error as { status?: number }).status === 403) {
        setAccessDenied(true);
        return;
      }

      toast.error(
        error instanceof Error ? error.message : "Failed to load members."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDirectory();
  }, [loadDirectory]);

  const handleInvite = useCallback(() => {
    if (!inviteEmail.trim()) {
      toast.error("Enter an email address to invite.");
      return;
    }

    startTransition(async () => {
      try {
        const { invitation, created } = await createOrganizationInvitation({
          email: inviteEmail.trim(),
          role: inviteRole,
        });

        setInvitations((prev) => {
          const next = prev.filter((item) => item.id !== invitation.id);
          return [invitation, ...next];
        });
        setInviteEmail("");
        setInviteRole("manager");
        toast.success(created ? "Invitation created." : "Invitation refreshed.");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to create invitation."
        );
      }
    });
  }, [inviteEmail, inviteRole]);

  const handleCopyInvite = useCallback(async (invitation: Invitation) => {
    try {
      await navigator.clipboard.writeText(invitation.invite_url);
      toast.success("Invite link copied.");
    } catch {
      toast.error("Failed to copy invite link.");
    }
  }, []);

  const handleInvitationAction = useCallback(
    (invitation: Invitation, action: "resend" | "revoke") => {
      startTransition(async () => {
        try {
          const { invitation: updated } = await updateOrganizationInvitation(
            invitation.id,
            action
          );

          if (action === "revoke") {
            setInvitations((prev) => prev.filter((item) => item.id !== invitation.id));
            toast.success("Invitation revoked.");
            return;
          }

          setInvitations((prev) => {
            const next = prev.filter((item) => item.id !== updated.id);
            return [updated, ...next];
          });
          toast.success("Invitation refreshed.");
        } catch (error) {
          toast.error(
            error instanceof Error ? error.message : "Failed to update invitation."
          );
        }
      });
    },
    []
  );

  const handleRoleChange = useCallback(
    (member: Member, role: Member["role"]) => {
      if (member.role === role) {
        return;
      }

      startTransition(async () => {
        try {
          const { member: updated } = await updateOrganizationMember(member.id, { role });
          setMembers((prev) =>
            prev.map((item) => (item.id === updated.id ? updated : item))
          );
          toast.success("Member role updated.");
        } catch (error) {
          toast.error(
            error instanceof Error ? error.message : "Failed to update member role."
          );
        }
      });
    },
    []
  );

  const handleDeactivateMember = useCallback((member: Member) => {
    startTransition(async () => {
      try {
        await deactivateOrganizationMember(member.id);
        setMembers((prev) => prev.filter((item) => item.id !== member.id));
        toast.success("Member deactivated.");
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to deactivate member."
        );
      }
    });
  }, []);

  if (loading) {
    return (
      <GlassCard className="p-[25px]">
        <div className="flex items-center justify-center py-12 text-[var(--text-secondary)]">
          <Loader2 className="mr-2 size-5 animate-spin" />
          Loading members...
        </div>
      </GlassCard>
    );
  }

  if (accessDenied) {
    return (
      <GlassCard className="p-[25px]">
        <div className="space-y-3">
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] tracking-[0.07px]">
            Members
          </h1>
          <p className="text-sm text-[var(--text-secondary)]">
            Only organization owners can manage members and invitations in MVP.
          </p>
        </div>
      </GlassCard>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] tracking-[0.07px]">
            Members
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Invite owners or managers and manage the current organization roster.
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          {members.length} active member{members.length === 1 ? "" : "s"}
        </Badge>
      </div>

      <GlassCard className="space-y-4 p-[25px]">
        <div>
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Invite a member
          </h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            New members join through a secure invite link and land in the current organization.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_160px_auto]">
          <div className="space-y-1.5">
            <Label htmlFor="invite-email">Email</Label>
            <Input
              id="invite-email"
              type="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="manager@example.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Role</Label>
            <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as Member["role"])}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="admin">Owner</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button
              onClick={handleInvite}
              disabled={isPending}
              className="w-full bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 md:w-auto"
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <MailPlus className="size-4" />}
              Send invite
            </Button>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-[25px]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Pending invitations
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Owners can resend or revoke invites before they are accepted.
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            {invitations.length} pending
          </Badge>
        </div>

        {invitations.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">
            No pending invitations.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Invited By</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="pr-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map((invitation) => (
                <TableRow key={invitation.id}>
                  <TableCell className="pl-4 font-medium text-[var(--text-primary)]">
                    {invitation.email}
                  </TableCell>
                  <TableCell>{ROLE_LABEL[invitation.role]}</TableCell>
                  <TableCell className="text-[var(--text-secondary)]">
                    {invitation.invited_by_label ?? "Owner"}
                  </TableCell>
                  <TableCell className="text-[var(--text-secondary)]">
                    {formatTimestamp(invitation.expires_at)}
                  </TableCell>
                  <TableCell className="pr-4">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => void handleCopyInvite(invitation)}
                        disabled={isPending}
                      >
                        <Link2 className="size-3.5" />
                        Copy link
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleInvitationAction(invitation, "resend")}
                        disabled={isPending}
                      >
                        Refresh
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleInvitationAction(invitation, "revoke")}
                        disabled={isPending}
                      >
                        Revoke
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </GlassCard>

      <GlassCard className="p-[25px]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              Active members
            </h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Owners can promote, demote, or deactivate members. At least one owner must remain.
            </p>
          </div>
          <Badge variant="outline" className="text-xs">
            {ownerCount} owner{ownerCount === 1 ? "" : "s"}
          </Badge>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-4">Member</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="pr-4 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((member) => {
              const isCurrentUser = member.id === currentUserId;
              const disableOwnerDemotion =
                member.role === "admin" && ownerCount <= 1;

              return (
                <TableRow key={member.id}>
                  <TableCell className="pl-4">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 items-center justify-center rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
                        <UserRound className="size-4" />
                      </div>
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">
                          {member.display_name?.trim() || member.email}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)]">
                          {member.email}
                          {isCurrentUser ? " - You" : ""}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="gap-1 text-xs">
                      <Shield className="size-3" />
                      {ROLE_LABEL[member.role]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-[var(--text-secondary)]">
                    {formatTimestamp(member.created_at)}
                  </TableCell>
                  <TableCell className="pr-4">
                    <div className="flex items-center justify-end gap-2">
                      <Select
                        value={member.role}
                        onValueChange={(value) =>
                          handleRoleChange(member, value as Member["role"])
                        }
                        disabled={isPending || disableOwnerDemotion}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="manager">Manager</SelectItem>
                          <SelectItem value="admin">Owner</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeactivateMember(member)}
                        disabled={isPending || disableOwnerDemotion}
                      >
                        <UserMinus className="size-3.5" />
                        Deactivate
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </GlassCard>
    </div>
  );
}
