"use client";

import { useRouter } from "next/navigation";
import type { Invoice } from "@/types/database";
import { DataTable } from "@/components/ui/data-table";
import { invoiceColumns } from "./columns";

interface InvoicesTableProps {
    invoices: Invoice[];
}

export function InvoicesTable({ invoices }: InvoicesTableProps) {
    const router = useRouter();

    const handleRowClick = (invoice: Invoice) => {
        router.push(`/invoices/${invoice.id}`);
    };

    return <DataTable columns={invoiceColumns} data={invoices} onRowClick={handleRowClick} />;
}
