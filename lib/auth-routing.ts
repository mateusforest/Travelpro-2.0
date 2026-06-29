export type AccessRoutingState = {
  profile: {
    global_role?: string | null
  } | null
  workspace: {
    type?: "operations" | "connect" | null
  } | null
}

export function resolveHomePath(access: AccessRoutingState) {
  if (access.profile?.global_role === "master") {
    return "/master"
  }

  if (access.workspace?.type === "operations") {
    return "/app"
  }

  if (access.workspace?.type === "connect") {
    return "/connect"
  }

  return null
}

export function canAccessPath(pathname: string, access: AccessRoutingState) {
  if (pathname.startsWith("/master")) {
    return access.profile?.global_role === "master"
  }

  if (pathname.startsWith("/connect")) {
    return access.workspace?.type === "connect"
  }

  if (pathname.startsWith("/portal")) {
    return access.workspace?.type === "operations"
  }

  if (pathname.startsWith("/app")) {
    return access.workspace?.type === "operations"
  }

  return true
}

export function resolvePostAuthPath(access: AccessRoutingState, requestedPath?: string | null) {
  if (
    requestedPath &&
    requestedPath !== "/login" &&
    requestedPath !== "/cadastro" &&
    canAccessPath(requestedPath, access)
  ) {
    return requestedPath
  }

  return resolveHomePath(access)
}
