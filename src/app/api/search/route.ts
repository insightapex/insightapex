import { NextResponse } from "next/server";
import { requireAuthApi } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import type { SearchResult } from "@/types/search";

export type { SearchResult, SearchResultType } from "@/types/search";

const MAX_PER_TYPE = 4;

export async function GET(req: Request) {
  const user = await requireAuthApi();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ results: [] as SearchResult[] });
  }

  try {
    const [parts, papers, categories, subCategories] = await Promise.all([
      prisma.part.findMany({
        where: {
          isActive: true,
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { code: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        },
        take: MAX_PER_TYPE,
        orderBy: [{ order: "asc" }, { title: "asc" }],
      }),
      prisma.paper.findMany({
        where: {
          isActive: true,
          OR: [
            { code: { contains: q, mode: "insensitive" } },
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        },
        take: MAX_PER_TYPE,
        orderBy: { code: "asc" },
        include: { part: { select: { id: true, title: true } } },
      }),
      prisma.category.findMany({
        where: {
          isActive: true,
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        },
        take: MAX_PER_TYPE,
        orderBy: [{ order: "asc" }, { title: "asc" }],
        include: {
          paper: { select: { id: true, code: true, title: true, partId: true } },
        },
      }),
      prisma.subCategory.findMany({
        where: {
          isActive: true,
          OR: [
            { title: { contains: q, mode: "insensitive" } },
            { description: { contains: q, mode: "insensitive" } },
          ],
        },
        take: MAX_PER_TYPE,
        orderBy: [{ order: "asc" }, { title: "asc" }],
        include: {
          category: {
            select: {
              id: true,
              title: true,
              paper: { select: { id: true, code: true, title: true, partId: true } },
            },
          },
        },
      }),
    ]);

    const results: SearchResult[] = [
      ...parts.map((part) => ({
        id: part.id,
        type: "part" as const,
        label: part.title,
        meta: part.code.replace(/_/g, " "),
        href: `/dashboard/quiz?partId=${part.id}`,
      })),
      ...papers.map((paper) => ({
        id: paper.id,
        type: "paper" as const,
        label: `${paper.code} — ${paper.title}`,
        meta: paper.part.title,
        href: `/dashboard/quiz?partId=${paper.partId}&paperId=${paper.id}`,
      })),
      ...categories.map((category) => ({
        id: category.id,
        type: "category" as const,
        label: category.title,
        meta: `${category.paper.code} · ${category.paper.title}`,
        href: `/dashboard/quiz?partId=${category.paper.partId}&paperId=${category.paper.id}&categoryId=${category.id}`,
      })),
      ...subCategories.map((subCategory) => ({
        id: subCategory.id,
        type: "subcategory" as const,
        label: subCategory.title,
        meta: `${subCategory.category.paper.code} · ${subCategory.category.title}`,
        href: `/dashboard/quiz?partId=${subCategory.category.paper.partId}&paperId=${subCategory.category.paper.id}&categoryId=${subCategory.category.id}&subCategoryId=${subCategory.id}`,
      })),
    ];

    return NextResponse.json({ results });
  } catch (error) {
    console.error("[api/search]", error);
    return NextResponse.json({ error: "Search is temporarily unavailable." }, { status: 500 });
  }
}
