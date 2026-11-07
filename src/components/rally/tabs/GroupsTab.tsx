import { useMemo, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Plus, Users, Globe2, Lock, Search } from "lucide-react";
import { useRally, type GroupSummary } from "@/lib/rally-store";
import { SPORTS, sportByKey, type SportKey } from "@/lib/rally-data";
import { PlaceAutocomplete } from "../PlaceAutocomplete";
import type { GeoPlace } from "@/lib/geocode";
import { GroupDetailSheet, InviteCodeInput } from "../GroupDetailSheet";
import { toast } from "sonner";

export function GroupsTab() {
  const { groups, createGroupAction } = useRally();
  const [query, setQuery] = useState("");
  const [detail, setDetail] = useState<GroupSummary | null>(null);
  const [creating, setCreating] = useState(false);

  const myGroups = groups.filter((g) => g.myRole !== null);
  const discover = groups.filter(
    (g) =>
      g.myRole === null &&
      g.isPublic &&
      (query.trim() === "" ||
        g.name.toLowerCase().includes(query.toLowerCase())),
  );

  return (
    <div className="pb-28">
      <header className="px-5 pt-6 pb-3">
        <h1 className="text-2xl font-black tracking-tight">Groups</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Clubs, teams, and friend groups. Games stay inside the group.
        </p>
      </header>

      <div className="px-5 space-y-2">
        <Button
          onClick={() => setCreating(true)}
          className="w-full h-11 rounded-md"
        >
          <Plus className="h-4 w-4 mr-1.5" /> Create group
        </Button>
        <InviteCodeInput />
      </div>

      <section className="px-5 mt-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-2">
          Your groups · {myGroups.length}
        </p>
        {myGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            You're not in any groups yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {myGroups.map((g) => (
              <GroupRow key={g.id} group={g} onClick={() => setDetail(g)} />
            ))}
          </ul>
        )}
      </section>

      <section className="px-5 mt-6">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-2">
          Discover public groups
        </p>
        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search groups"
            className="pl-9 h-10 rounded-md"
          />
        </div>
        {discover.length === 0 ? (
          <p className="text-sm text-muted-foreground">No public groups found.</p>
        ) : (
          <ul className="space-y-2">
            {discover.map((g) => (
              <GroupRow key={g.id} group={g} onClick={() => setDetail(g)} />
            ))}
          </ul>
        )}
      </section>

      <GroupDetailSheet group={detail} onClose={() => setDetail(null)} />

      <CreateGroupSheet
        open={creating}
        onOpenChange={setCreating}
        onCreated={async (input) => {
          await createGroupAction(input);
          toast.success("Group created");
          setCreating(false);
        }}
      />
    </div>
  );
}

function GroupRow({
  group,
  onClick,
}: {
  group: GroupSummary;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        onClick={onClick}
        className="w-full flex items-center gap-3 p-3 rounded-md border border-border bg-card text-left hover:border-foreground/20 tap-scale"
      >
        <div className="h-12 w-12 rounded-md bg-primary/10 text-primary font-bold flex items-center justify-center">
          {group.name.slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="font-semibold truncate">{group.name}</p>
            {group.isPublic ? (
              <Globe2 className="h-3 w-3 text-muted-foreground" />
            ) : (
              <Lock className="h-3 w-3 text-muted-foreground" />
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            <Users className="inline h-3 w-3 mr-1" />
            {group.memberCount} members
            {group.city && ` · ${group.city}`}
          </p>
          <div className="flex gap-1 mt-1">
            {group.sports.slice(0, 4).map((s) => {
              const sp = sportByKey(s as SportKey);
              return (
                <span key={s} className="text-xs">
                  {sp.emoji}
                </span>
              );
            })}
          </div>
        </div>
      </button>
    </li>
  );
}

function CreateGroupSheet({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: (input: {
    name: string;
    description?: string;
    sports: string[];
    city?: string;
    lat?: number | null;
    lng?: number | null;
    isPublic: boolean;
  }) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sports, setSports] = useState<SportKey[]>([]);
  const [place, setPlace] = useState<GeoPlace | null>(null);
  const [isPublic, setIsPublic] = useState(true);

  const toggle = (s: SportKey) =>
    setSports((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const reset = () => {
    setName("");
    setDescription("");
    setSports([]);
    setPlace(null);
    setIsPublic(true);
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) reset();
      }}
    >
      <SheetContent side="bottom" className="rounded-t-lg h-[92dvh] overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-2xl">New group</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 py-4">
          <div>
            <Label className="mb-1.5 block">Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              placeholder="Sunday Soccer Club"
              className="h-12 rounded-md"
            />
          </div>
          <div>
            <Label className="mb-1.5 block">Description (optional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={280}
              placeholder="Who we are, when we play..."
              className="rounded-md min-h-20"
            />
          </div>
          <div>
            <Label className="mb-1.5 block">Sports</Label>
            <div className="flex flex-wrap gap-1.5">
              {SPORTS.map((s) => {
                const active = sports.includes(s.key);
                return (
                  <button
                    key={s.key}
                    onClick={() => toggle(s.key)}
                    className={`px-3 py-1.5 rounded-md border text-sm ${
                      active
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border"
                    }`}
                  >
                    {s.emoji} {s.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block">City / area (optional)</Label>
            <PlaceAutocomplete
              value={place}
              onChange={setPlace}
              placeholder="Where does the group play?"
            />
          </div>
          <div>
            <Label className="mb-1.5 block">Visibility</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setIsPublic(true)}
                className={`p-3 rounded-md border text-left ${
                  isPublic
                    ? "bg-primary/10 border-primary"
                    : "bg-background border-border"
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-sm">
                  <Globe2 className="h-4 w-4" /> Public
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Anyone can find and request to join.
                </p>
              </button>
              <button
                onClick={() => setIsPublic(false)}
                className={`p-3 rounded-md border text-left ${
                  !isPublic
                    ? "bg-primary/10 border-primary"
                    : "bg-background border-border"
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-sm">
                  <Lock className="h-4 w-4" /> Private
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Invite-only via code.
                </p>
              </button>
            </div>
          </div>
          <Button
            onClick={() =>
              onCreated({
                name: name.trim(),
                description: description.trim() || undefined,
                sports,
                city: place?.city,
                lat: place?.lat ?? null,
                lng: place?.lng ?? null,
                isPublic,
              })
            }
            disabled={!name.trim() || sports.length === 0}
            className="w-full h-12 rounded-md text-base font-semibold"
          >
            Create group
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
