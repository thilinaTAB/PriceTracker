export interface Shop{
    id: number;
    name: string;
    websiteUrl: string;
    logoUrl: string;
    active: boolean;
    createdAt: Date;
}

export interface Product{
    id: number;
    name: string;
    brand: string | null;
    modelNumber: string | null;
    sku: string | null;
    description:string | null;
    price: number;
    previousPrice: number | null;
    imageUrl: string | null;
    sourceUrl: string;
    category: string;
    subCategory: string;
    isPromotion: boolean;
    isAvailable: boolean;
    shopId: number;
    shopName: string;
    createdAt: Date;
    updatedAt: Date;
}