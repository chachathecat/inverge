import { renderReviewOsItemsPage } from "../items/page";

type PageProps = {
  searchParams?: Promise<{ mode?: string; saved?: string }>;
};

export default async function ReviewOsNotesPage({ searchParams }: PageProps) {
  return renderReviewOsItemsPage(searchParams, "/app/notes");
}
