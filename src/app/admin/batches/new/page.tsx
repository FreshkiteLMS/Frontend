"use client";

import { Header } from '@/components/layout/header';
import { BatchCreateWizard } from '@/components/batches/batch-create-wizard';

export default function NewBatchPage() {
    return (
        <>
            <Header />
            <BatchCreateWizard />
        </>
    );
}
