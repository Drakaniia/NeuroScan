import { KeyRound, Pencil, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { Tag } from "@/components/ui/badges";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Callout, ErrorState, Panel, Spinner } from "@/components/ui/feedback";
import { Checkbox, Field, Input, Select } from "@/components/ui/form";
import { useToast } from "@/components/ui/toast";
import {
  useCreateUser,
  useResetPassword,
  useUpdateUser,
  useUsers,
} from "@/lib/api/queries";
import type { Role, UserSummary } from "@/lib/api/types";
import {
  formatDateTime,
  relativeTime,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
} from "@/lib/format";
import { useSession } from "@/lib/session";
import { useForm } from "@/lib/use-form";
import { PasswordRules, passwordChecks } from "@/screens/auth/PasswordRules";

const ROLES: Role[] = ["radiologist", "technologist", "viewer", "admin"];

function RoleSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: Role;
  onChange: (role: Role) => void;
}) {
  return (
    <Select
      id={id}
      value={value}
      onChange={(event) => onChange(event.target.value as Role)}
    >
      {ROLES.map((role) => (
        <option key={role} value={role}>
          {ROLE_LABELS[role]}
        </option>
      ))}
    </Select>
  );
}

function CreateUserDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const create = useCreateUser();
  const toast = useToast();
  const form = useForm({
    fullName: "",
    username: "",
    role: "radiologist" as Role,
    password: "",
  });
  const { reset } = form;
  useEffect(() => {
    if (open)
      reset({ fullName: "", username: "", role: "radiologist", password: "" });
  }, [open, reset]);

  const submit = async () => {
    const { values } = form;
    const found: Record<string, string> = {};
    if (!values.fullName.trim()) found.fullName = "Full name is required.";
    if (!/^[A-Za-z0-9._-]{3,32}$/.test(values.username.trim()))
      found.username = "3–32 letters, digits, '.', '_' or '-'.";
    if (
      !passwordChecks(values.username, values.password).every((rule) => rule.ok)
    ) {
      found.password = "The temporary password does not meet the requirements.";
    }
    if (!form.check(found)) return;
    try {
      const user = await create.mutateAsync({
        fullName: values.fullName.trim(),
        username: values.username.trim(),
        role: values.role,
        password: values.password,
      });
      toast.success(
        "User created",
        `${user.fullName} must choose a new password at first sign-in.`,
      );
      onClose();
    } catch (error) {
      form.fail(error);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add user"
      description="The user signs in with this temporary password and must replace it immediately."
      dismissible={!create.isPending}
      footer={
        <>
          <Button onClick={onClose} disabled={create.isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={create.isPending}
            onClick={() => void submit()}
          >
            Create user
          </Button>
        </>
      }
    >
      <form
        className="space-y-3"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        {form.formError ? (
          <Callout tone="danger">{form.formError}</Callout>
        ) : null}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Full name" required error={form.errors.fullName}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                data-autofocus
                value={form.values.fullName}
                onChange={(event) => form.set("fullName", event.target.value)}
              />
            )}
          </Field>
          <Field label="Username" required error={form.errors.username}>
            {({ id, describedBy, invalid }) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                invalid={invalid}
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="none"
                value={form.values.username}
                onChange={(event) => form.set("username", event.target.value)}
              />
            )}
          </Field>
        </div>
        <Field label="Role" hint={ROLE_DESCRIPTIONS[form.values.role]}>
          {({ id }) => (
            <RoleSelect
              id={id}
              value={form.values.role}
              onChange={(role) => form.set("role", role)}
            />
          )}
        </Field>
        <Field label="Temporary password" required error={form.errors.password}>
          {({ id, describedBy, invalid }) => (
            <Input
              id={id}
              aria-describedby={describedBy}
              invalid={invalid}
              type="password"
              autoComplete="new-password"
              value={form.values.password}
              onChange={(event) => form.set("password", event.target.value)}
            />
          )}
        </Field>
        <PasswordRules
          username={form.values.username}
          password={form.values.password}
        />
        <button
          type="submit"
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
        />
      </form>
    </Dialog>
  );
}

function EditUserDialog({
  user,
  onClose,
}: {
  user: UserSummary | null;
  onClose: () => void;
}) {
  const update = useUpdateUser();
  const reset = useResetPassword();
  const toast = useToast();
  const { session } = useSession();
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<Role>("viewer");
  const [active, setActive] = useState(true);
  const [temporary, setTemporary] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName);
      setRole(user.role);
      setActive(user.isActive);
      setTemporary("");
      setError(null);
    }
  }, [user]);

  if (!user) return null;
  const self = user.id === session?.user.id;

  const save = async () => {
    setError(null);
    try {
      await update.mutateAsync({
        id: user.id,
        input: { fullName: fullName.trim(), role, isActive: active },
      });
      if (temporary) {
        if (
          !passwordChecks(user.username, temporary).every((rule) => rule.ok)
        ) {
          setError("The temporary password does not meet the requirements.");
          return;
        }
        await reset.mutateAsync({ id: user.id, password: temporary });
      }
      toast.success(
        "User updated",
        temporary
          ? `${user.fullName} must choose a new password at next sign-in.`
          : undefined,
      );
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  };

  const pending = update.isPending || reset.isPending;
  return (
    <Dialog
      open
      onClose={onClose}
      title={`Edit ${user.fullName}`}
      description={`Username ${user.username}`}
      dismissible={!pending}
      footer={
        <>
          <Button onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={pending}
            onClick={() => void save()}
          >
            Save
          </Button>
        </>
      }
    >
      <form
        className="space-y-3"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        {error ? <Callout tone="danger">{error}</Callout> : null}
        <Field label="Full name" required>
          {({ id }) => (
            <Input
              id={id}
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
            />
          )}
        </Field>
        <Field label="Role" hint={ROLE_DESCRIPTIONS[role]}>
          {({ id }) => <RoleSelect id={id} value={role} onChange={setRole} />}
        </Field>
        <Checkbox
          checked={active}
          onChange={setActive}
          disabled={self}
          label="Account active"
          description={
            self
              ? "You cannot deactivate your own account."
              : "Inactive accounts cannot sign in. Their history is kept."
          }
        />
        <div className="border-t border-line pt-3">
          <Field
            label="Issue a temporary password"
            hint="Leave empty to keep the current password."
          >
            {({ id }) => (
              <Input
                id={id}
                type="password"
                autoComplete="new-password"
                value={temporary}
                onChange={(event) => setTemporary(event.target.value)}
              />
            )}
          </Field>
          {temporary ? (
            <div className="mt-2">
              <PasswordRules username={user.username} password={temporary} />
            </div>
          ) : null}
        </div>
        <button
          type="submit"
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
        />
      </form>
    </Dialog>
  );
}

export function UsersSettings() {
  const users = useUsers();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<UserSummary | null>(null);

  return (
    <Panel
      title="Users"
      description="Accounts that can sign in to this workstation."
      actions={
        <Button
          size="sm"
          variant="primary"
          icon={<UserPlus className="size-3.5" aria-hidden="true" />}
          onClick={() => setCreating(true)}
        >
          Add user
        </Button>
      }
    >
      {users.isLoading ? (
        <div className="p-4">
          <Spinner label="Loading users…" />
        </div>
      ) : users.isError ? (
        <ErrorState error={users.error} onRetry={() => void users.refetch()} />
      ) : (
        <section
          // biome-ignore lint/a11y/noNoninteractiveTabindex: keyboard-scrollable table region
          tabIndex={0}
          aria-label="Users"
          className="overflow-x-auto focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent"
        >
        <table className="w-full min-w-[520px] text-left text-sm">
          <caption className="sr-only">Users</caption>
          <thead>
            <tr className="border-b border-line text-xs font-medium text-ink-muted [&>th]:whitespace-nowrap [&>th]:pb-2 [&>th]:pt-3 [&>th]:font-medium">
              <th scope="col" className="px-3.5 py-2 font-semibold">
                User
              </th>
              <th scope="col" className="px-2.5 py-2 font-semibold">
                Role
              </th>
              <th scope="col" className="px-2.5 py-2 font-semibold">
                Status
              </th>
              <th scope="col" className="px-2.5 py-2 font-semibold">
                Last sign-in
              </th>
              <th scope="col" className="w-[72px] px-2.5 py-2">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {users.data?.map((user) => {
              const locked =
                user.lockedUntil && new Date(user.lockedUntil) > new Date();
              return (
                <tr
                  key={user.id}
                  className="border-b border-line last:border-b-0"
                >
                  <td className="px-3.5 py-2.5">
                    <p className="font-medium text-ink">{user.fullName}</p>
                    <p className="font-mono text-xs text-ink-muted">
                      {user.username}
                    </p>
                  </td>
                  <td className="px-2.5 py-2.5 text-ink-secondary">
                    {ROLE_LABELS[user.role]}
                  </td>
                  <td className="px-2.5 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {user.isActive ? (
                        <Tag tone="success">Active</Tag>
                      ) : (
                        <Tag>Inactive</Tag>
                      )}
                      {locked ? (
                        <Tag tone="danger">
                          Locked until {formatDateTime(user.lockedUntil)}
                        </Tag>
                      ) : null}
                      {user.mustChangePassword ? (
                        <Tag tone="warning">
                          <KeyRound className="size-3" aria-hidden="true" />
                          Temporary password
                        </Tag>
                      ) : null}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-2.5 py-2.5 text-xs text-ink-muted">
                    {user.lastLoginAt
                      ? relativeTime(user.lastLoginAt)
                      : "Never"}
                  </td>
                  <td className="whitespace-nowrap px-2.5 py-2.5 text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={<Pencil className="size-3.5" aria-hidden="true" />}
                      onClick={() => setEditing(user)}
                    >
                      Edit
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </section>
      )}
      <CreateUserDialog open={creating} onClose={() => setCreating(false)} />
      <EditUserDialog user={editing} onClose={() => setEditing(null)} />
    </Panel>
  );
}
