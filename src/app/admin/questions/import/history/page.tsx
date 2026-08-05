"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/Table";

type ImportRow = {
  id: string;
  fileName: string;
  status: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  createdCount: number;
  updatedCount: number;
  failedCount: number;
  createdAt: string;
  completedAt: string | null;
  uploadedBy: { id: string; name: string; email: string };
};

export default function QuestionImportHistoryPage() {
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/questions/import/history");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load history");
      setRows(json.imports ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  async function handleDelete(row: ImportRow) {
    if (row.status !== "COMPLETED") return;

    const deleteAll = window.confirm(
      `Delete Excel import "${row.fileName}"?\n\n` +
        `This permanently removes questions from this file.\n` +
        `• Created by this import: ${row.createdCount}\n` +
        `• Updated by this import: ${row.updatedCount}\n\n` +
        `OK = delete created + updated (whole wrong file)\n` +
        `Cancel = choose created-only or abort`
    );

    let mode: "all" | "created" = "all";
    if (!deleteAll) {
      const createdOnly = window.confirm(
        `Delete only questions CREATED by this import (${row.createdCount})?\n\n` +
          `OK = created only\n` +
          `Cancel = abort`
      );
      if (!createdOnly) return;
      mode = "created";
    }

    setDeletingId(row.id);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/questions/import/history/${row.id}?mode=${mode}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to delete import");
      setMessage(
        `Deleted ${json.result?.deletedCount ?? 0} question(s) from "${row.fileName}".`
      );
      await loadHistory();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete import");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Import History"
        description="Excel question bank uploads — who imported, counts, error reports, and delete wrong imports."
        action={{ label: "Import Excel", href: "/admin/questions/import" }}
      />

      <Link href="/admin/questions" className="text-sm text-brand-600 hover:underline">
        ← Practice Questions
      </Link>

      {error && <Alert tone="error">{error}</Alert>}
      {message && <Alert tone="success">{message}</Alert>}

      {loading ? (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          title="No imports yet"
          description="Upload an FA Question Bank workbook to get started."
          actionLabel="Import Excel"
          actionHref="/admin/questions/import"
        />
      ) : (
        <Card>
          <CardBody className="overflow-x-auto p-0">
            <Table>
              <TableHead>
                <TableHeader>File</TableHeader>
                <TableHeader>Uploaded by</TableHeader>
                <TableHeader>Date</TableHeader>
                <TableHeader>Created</TableHeader>
                <TableHeader>Updated</TableHeader>
                <TableHeader>Failed</TableHeader>
                <TableHeader>Status</TableHeader>
                <TableHeader>Report</TableHeader>
                <TableHeader className="text-right">Actions</TableHeader>
              </TableHead>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.fileName}</TableCell>
                    <TableCell>
                      <div>
                        <p>{r.uploadedBy.name}</p>
                        <p className="text-xs text-slate-500">{r.uploadedBy.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-sm">
                      {new Date(r.createdAt).toLocaleString()}
                    </TableCell>
                    <TableCell>{r.createdCount}</TableCell>
                    <TableCell>{r.updatedCount}</TableCell>
                    <TableCell>{r.failedCount}</TableCell>
                    <TableCell>
                      <Badge
                        tone={
                          r.status === "COMPLETED"
                            ? "success"
                            : r.status === "FAILED" || r.status === "CANCELLED"
                              ? "danger"
                              : "neutral"
                        }
                      >
                        {r.status === "CANCELLED" ? "DELETED" : r.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <a
                        className="text-sm font-medium text-brand-600 hover:underline"
                        href={`/api/admin/questions/import/history/${r.id}/errors?format=csv`}
                      >
                        Download CSV
                      </a>
                    </TableCell>
                    <TableCell className="text-right">
                      {r.status === "COMPLETED" ? (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:bg-red-50 hover:text-red-700"
                          disabled={deletingId === r.id}
                          onClick={() => handleDelete(r)}
                        >
                          {deletingId === r.id ? "Deleting…" : "Delete import"}
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
