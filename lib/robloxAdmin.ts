const DEFAULT_CLOTHING_ID = BigInt('75919610314518');
const ROBLOSECURITY_COOKIE = process.env.ROBLOSECURITY_COOKIE || '';

function getClothingId() {
  const rawValue = process.env.ROBLOX_CLOTHING_ID || '';
  const sanitized = rawValue.replace(/[^0-9]/g, '');

  if (!sanitized) {
    return DEFAULT_CLOTHING_ID;
  }

  try {
    return BigInt(sanitized);
  } catch {
    return DEFAULT_CLOTHING_ID;
  }
}

type RobloxUser = {
  id: number;
  name: string;
  displayName: string;
};

type RobloxFriend = {
  id: number;
  name: string;
  displayName?: string;
};

type RobloxProfile = {
  id: number;
  name?: string;
  displayName?: string;
};

function getRobloxHeaders() {
  if (!ROBLOSECURITY_COOKIE) {
    throw new Error('ROBLOSECURITY_COOKIE no está configurada');
  }

  return {
    cookie: `.ROBLOSECURITY=${ROBLOSECURITY_COOKIE}`,
  };
}

async function robloxFetch(input: string, init: RequestInit = {}) {
  return fetch(input, {
    ...init,
    headers: {
      ...(init.headers || {}),
      ...getRobloxHeaders(),
    },
  });
}

async function getAuthenticatedUser(): Promise<RobloxUser> {
  const response = await robloxFetch('https://users.roblox.com/v1/users/authenticated');
  if (!response.ok) {
    throw new Error(`No se pudo autenticar en Roblox (${response.status})`);
  }

  return response.json();
}

async function getAllFriends(userId: number): Promise<RobloxFriend[]> {
  const friends: RobloxFriend[] = [];
  let cursor = '';

  while (true) {
    const url = new URL(`https://friends.roblox.com/v1/users/${userId}/friends`);
    url.searchParams.set('limit', '100');
    if (cursor) {
      url.searchParams.set('cursor', cursor);
    }

    const response = await robloxFetch(url.toString());
    if (!response.ok) {
      throw new Error(`No se pudo cargar la lista de amigos (${response.status})`);
    }

    const data = await response.json();
    friends.push(...(data.data || []));

    if (!data.nextPageCursor) {
      break;
    }

    cursor = data.nextPageCursor;
  }

  return friends;
}

async function getRobloxProfile(userId: number): Promise<RobloxProfile | null> {
  try {
    const response = await robloxFetch(`https://users.roblox.com/v1/users/${userId}`);

    if (!response.ok) {
      return null;
    }

    return response.json();
  } catch {
    return null;
  }
}

async function getAvatarUrl(userId: number): Promise<string | null> {
  const response = await robloxFetch(
    `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=150x150&format=Png&isCircular=true`
  );

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const item = data.data?.[0];
  return item?.state === 'Completed' ? item.imageUrl || null : null;
}

async function wearsTeamShirt(userId: number): Promise<boolean> {
  const clothingId = getClothingId();
  const avatarResponse = await robloxFetch(`https://avatar.roblox.com/v1/users/${userId}/avatar`);

  if (avatarResponse.ok) {
    const avatarData = await avatarResponse.json();
    const assets = Array.isArray(avatarData.assets) ? avatarData.assets : [];
    const isWearing = assets.some((asset: { id?: string | number }) => String(asset?.id ?? '') === clothingId.toString());

    if (isWearing) {
      return true;
    }
  }

  const inventoryResponse = await robloxFetch(
    `https://inventory.roblox.com/v1/users/${userId}/items/Asset/${clothingId.toString()}/is-owned`
  );

  if (!inventoryResponse.ok) {
    return false;
  }

  return (await inventoryResponse.text()).trim() === 'true';
}

export type SyncableRobloxFriend = {
  robloxUserId: number;
  robloxUser: string;
  displayName: string;
  profileImageUrl: string | null;
};

export async function loadEligibleRobloxFriends(): Promise<{
  authenticatedUser: RobloxUser;
  friends: SyncableRobloxFriend[];
}> {
  const authenticatedUser = await getAuthenticatedUser();
  const friends = await getAllFriends(authenticatedUser.id);
  const eligibleFriends: SyncableRobloxFriend[] = [];

  for (const friend of friends) {
    if (!(await wearsTeamShirt(friend.id))) {
      continue;
    }

    const profile = (friend.name && friend.displayName)
      ? { name: friend.name, displayName: friend.displayName }
      : await getRobloxProfile(friend.id);

    const robloxUser = (profile?.name || friend.name || friend.displayName || '').trim();
    const displayName = (profile?.displayName || friend.displayName || profile?.name || friend.name || '').trim();

    eligibleFriends.push({
      robloxUserId: friend.id,
      robloxUser: robloxUser || `user-${friend.id}`,
      displayName: displayName || robloxUser || `user-${friend.id}`,
      profileImageUrl: await getAvatarUrl(friend.id),
    });
  }

  return {
    authenticatedUser,
    friends: eligibleFriends,
  };
}