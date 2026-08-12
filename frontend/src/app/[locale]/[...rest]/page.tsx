import { notFound } from "next/navigation";

// Any URL that doesn't match a known page lands here. Without this catch-all,
// Next serves its generic built-in 404 instead of app/[locale]/not-found.tsx.
export default function CatchAllPage() {
    notFound();
}
