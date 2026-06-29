export declare const generateAndUploadCertificate: (title: string, authors: string[], journalName: string, publicationDate: string, paperSlug: string) => Promise<{
    authorCertificates: {
        authorName: string;
        certId: string;
        pdfUrl: string;
        pngUrl: string;
    }[];
}>;
//# sourceMappingURL=certificateGenerator.d.ts.map