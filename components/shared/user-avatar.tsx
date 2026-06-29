"use client"

function getInitial({
  fullName,
  email,
}: {
  fullName?: string | null
  email?: string | null
}) {
  const source = fullName?.trim() || email?.trim() || "C"
  return source.charAt(0).toUpperCase()
}

export function UserAvatar({
  fullName,
  email,
  avatarUrl,
  size = 40,
  className = "",
}: {
  fullName?: string | null
  email?: string | null
  avatarUrl?: string | null
  size?: number
  className?: string
}) {
  const initial = getInitial({ fullName, email })

  if (avatarUrl) {
    return (
      <div
        className={`overflow-hidden rounded-full border border-gray-200 bg-gray-100 ${className}`}
        style={{ width: size, height: size }}
      >
        <img
          src={avatarUrl}
          alt={fullName || email || "Avatar"}
          className="h-full w-full object-cover"
        />
      </div>
    )
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full border border-gray-200 bg-[#0a0a0a] text-sm font-medium text-white ${className}`}
      style={{ width: size, height: size }}
      aria-label={fullName || email || "Avatar"}
    >
      {initial}
    </div>
  )
}
