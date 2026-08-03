/** The only role the Community security runtime may materialize or persist. */
export const COMMUNITY_ADMIN_ROLE = 'ROLE_ADMIN' as const;

/** Password is intentionally absent from the administrative GET response. */
export interface CommunityUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  active: boolean | null;
  userRoles: string[] | null;
}

/** Browser-only editor state. `newPassword` is never populated from a GET response. */
export interface CommunityUserDraft {
  isNew: boolean;
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  active: boolean;
  newPassword: string;
}

/** Exact public save DTO. `password: null` is the server contract for retaining an existing hash. */
export interface CommunityUserSaveRequest {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  active: boolean;
  password: string | null;
  userRoles: [typeof COMMUNITY_ADMIN_ROLE];
}

function toOptionalText(value: string | null): string {

  return value ?? '';
}

/** Builds a detached editor state, so a password can never leak from the catalog into the form. */
export function buildCommunityUserDraft(user: CommunityUser): CommunityUserDraft {

  return {
    isNew: false,
    id: user.id,
    firstName: toOptionalText(user.firstName),
    lastName: toOptionalText(user.lastName),
    email: toOptionalText(user.email),
    active: user.active !== false,
    newPassword: '',
  };
}

/** Produces the one-role Community payload and makes an unchanged update password explicitly null. */
export function buildCommunityUserSaveRequest(draft: CommunityUserDraft): CommunityUserSaveRequest {

  const id = draft.id.trim();
  const password = draft.newPassword.trim();
  if (id.length === 0) {
    throw new Error('User ID is required.');
  }
  if (draft.isNew && password.length === 0) {
    throw new Error('A non-blank password is required when creating a user.');
  }

  return {
    id,
    firstName: draft.firstName.trim(),
    lastName: draft.lastName.trim(),
    email: draft.email.trim(),
    active: draft.active,
    password: password.length === 0 ? null : password,
    userRoles: [COMMUNITY_ADMIN_ROLE],
  };
}
