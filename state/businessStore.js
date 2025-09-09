// Session-scoped business profile registration state
let profile = null; // { data: {...}, status: 'pending'|'approved'|'rejected' }

export function getBusinessProfile() {
  return profile ? { ...profile, data: { ...profile.data } } : null;
}

export function submitBusinessProfile(data) {
  profile = { data: { ...data }, status: 'pending' };
}

