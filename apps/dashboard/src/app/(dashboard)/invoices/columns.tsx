"use client";

import Link from "next/link";
import { ArrowUpDown, ArrowUp, ArrowDown, AlertTriangle, RefreshCw, Upload } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import type { Invoice } from "@/types/database";
import { StatusBadge } from "@/components/ui/status-badge";
import { SourceBadge } from "@/components/source-badge";
import { formatCurrency, formatDate, formatRelativeTime } from "@/lib/format";
import { formatStatusLabel, statusToVariant } from "@/lib/invoice-status";
import { Button } from "@/components/ui/button";

export const invoiceColumns: ColumnDef<Invoice>[] = [
    {
        accessorKey: "invoice_number",
        header: ({ column }) => {
            const isSorted = column.getIsSorted();
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting()}
                    className="-ml-4 h-8 hover:bg-transparent"
                >
                    Invoice #
                    {isSorted === "asc" ? (
                        <ArrowUp className="ml-2 h-4 w-4" />
                    ) : isSorted === "desc" ? (
                        <ArrowDown className="ml-2 h-4 w-4" />
                    ) : (
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    )}
                </Button>
            );
        },
        cell: ({ row }) => {
            const invoice = row.original;
            return (
                <Link
                    href={`/invoices/${invoice.id}`}
                    className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                >
                    {invoice.invoice_number ?? invoice.original_filename}
                </Link>
            );
        },
    },
    {
        accessorKey: "vendor_name",
        header: ({ column }) => {
            const isSorted = column.getIsSorted();
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting()}
                    className="-ml-4 h-8 hover:bg-transparent"
                >
                    Vendor
                    {isSorted === "asc" ? (
                        <ArrowUp className="ml-2 h-4 w-4" />
                    ) : isSorted === "desc" ? (
                        <ArrowDown className="ml-2 h-4 w-4" />
                    ) : (
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    )}
                </Button>
            );
        },
        cell: ({ row }) => {
            return (
                <span className="text-sm text-foreground">
                    {row.getValue("vendor_name") ?? "—"}
                </span>
            );
        },
    },
    {
        accessorKey: "invoice_date",
        header: ({ column }) => {
            const isSorted = column.getIsSorted();
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting()}
                    className="-ml-4 h-8 hover:bg-transparent"
                >
                    Date
                    {isSorted === "asc" ? (
                        <ArrowUp className="ml-2 h-4 w-4" />
                    ) : isSorted === "desc" ? (
                        <ArrowDown className="ml-2 h-4 w-4" />
                    ) : (
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    )}
                </Button>
            );
        },
        cell: ({ row }) => {
            return (
                <span className="text-sm text-muted-foreground">
                    {formatDate(row.getValue("invoice_date"))}
                </span>
            );
        },
    },
    {
        accessorKey: "total_amount",
        header: ({ column }) => {
            const isSorted = column.getIsSorted();
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting()}
                    className="-ml-4 h-8 hover:bg-transparent"
                >
                    Amount
                    {isSorted === "asc" ? (
                        <ArrowUp className="ml-2 h-4 w-4" />
                    ) : isSorted === "desc" ? (
                        <ArrowDown className="ml-2 h-4 w-4" />
                    ) : (
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    )}
                </Button>
            );
        },
        cell: ({ row }) => {
            const amount = row.getValue("total_amount") as number;
            return (
                <span className="text-sm font-medium text-foreground text-right block">
                    {formatCurrency(amount)}
                </span>
            );
        },
    },
    {
        accessorKey: "status",
        header: ({ column }) => {
            const isSorted = column.getIsSorted();
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting()}
                    className="-ml-4 h-8 hover:bg-transparent"
                >
                    Status
                    {isSorted === "asc" ? (
                        <ArrowUp className="ml-2 h-4 w-4" />
                    ) : isSorted === "desc" ? (
                        <ArrowDown className="ml-2 h-4 w-4" />
                    ) : (
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    )}
                </Button>
            );
        },
        cell: ({ row }) => {
            const invoice = row.original;
            return (
                <div className="flex items-center gap-1.5">
                    <StatusBadge variant={statusToVariant(invoice.status)}>
                        {formatStatusLabel(invoice.status)}
                    </StatusBadge>
                    {invoice.duplicate_status === "suspected" && (
                        <span
                            className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800"
                            title="Possible duplicate"
                        >
                            <AlertTriangle className="size-3" aria-hidden="true" />
                            Dup
                        </span>
                    )}
                    {invoice.needs_reexport && (
                        <span
                            className="inline-flex items-center gap-0.5 rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-medium text-blue-800"
                            title="Re-export needed"
                        >
                            <Upload className="size-3" aria-hidden="true" />
                            Export
                        </span>
                    )}
                </div>
            );
        },
    },
    {
        accessorKey: "source",
        header: "Source",
        cell: ({ row }) => {
            return <SourceBadge source={row.getValue("source")} />;
        },
    },
    {
        accessorKey: "uploaded_at",
        header: ({ column }) => {
            const isSorted = column.getIsSorted();
            return (
                <Button
                    variant="ghost"
                    onClick={() => column.toggleSorting()}
                    className="-ml-4 h-8 hover:bg-transparent"
                >
                    Created
                    {isSorted === "asc" ? (
                        <ArrowUp className="ml-2 h-4 w-4" />
                    ) : isSorted === "desc" ? (
                        <ArrowDown className="ml-2 h-4 w-4" />
                    ) : (
                        <ArrowUpDown className="ml-2 h-4 w-4" />
                    )}
                </Button>
            );
        },
        cell: ({ row }) => {
            return (
                <span className="text-sm text-muted-foreground">
                    {formatRelativeTime(row.getValue("uploaded_at"))}
                </span>
            );
        },
    },
];
