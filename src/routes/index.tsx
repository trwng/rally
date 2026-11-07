import { createFileRoute } from "@tanstack/react-router";
import { RallyApp } from "@/components/rally/RallyApp";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Rally — Find people to play sports with" },
      {
        name: "description",
        content:
          "Rally helps adults find pickup games for volleyball, soccer, tennis, pickleball, basketball and more. Post a game or join one nearby.",
      },
      {
        property: "og:title",
        content: "Rally — Find people to play sports with",
      },
      {
        property: "og:description",
        content:
          "Post a pickup game or join one nearby. Volleyball, soccer, tennis, pickleball, basketball and more.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return <RallyApp />;
}
