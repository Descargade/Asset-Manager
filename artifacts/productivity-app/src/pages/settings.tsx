import { UserProfile } from "@clerk/react";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

export default function Settings() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Manage your account and preferences
        </p>
      </div>

      <UserProfile
        path={`${basePath}/settings`}
        routing="path"
        appearance={{
          elements: {
            rootBox: "w-full",
            card: "bg-card border border-border shadow-none w-full",
            navbar: "border-r border-border",
            pageScrollBox: "py-4",
          },
        }}
      />
    </div>
  );
}
