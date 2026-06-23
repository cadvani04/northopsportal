-- CreateTable
CREATE TABLE "OutreachAttachment" (
    "id" TEXT NOT NULL,
    "outreachTouchId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT,
    "mimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OutreachAttachment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "OutreachAttachment" ADD CONSTRAINT "OutreachAttachment_outreachTouchId_fkey" FOREIGN KEY ("outreachTouchId") REFERENCES "OutreachTouch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
