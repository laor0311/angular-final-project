import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map } from 'rxjs/operators';

export interface ProductItem {
  productid: string;
  categoryid: string;
  productname: string;
  qty: number;
  price: number;
  discount: number;
  image1: string;
  productgroup: string;
}

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly endpoint = 'https://salareanit.com/api/posproduct/';

  constructor(private http: HttpClient) {}

  GetAllProduct(group = 'sv5-theng_rithy') {
    return this.http
      .get(`${this.endpoint}?group=${encodeURIComponent(group)}`, { responseType: 'text' })
      .pipe(map((raw) => this.parseProductResponse(raw)));
  }

  PostProduct(body: ProductItem) {
    return this.http.post(this.endpoint, this.toApiPayload(body));
  }

  PutProduct(id: string, body: ProductItem) {
    return this.http.put(`${this.endpoint}${encodeURIComponent(id)}/`, this.toApiPayload(body));
  }

  DeleteProduct(id: string) {
    return this.http.delete(`${this.endpoint}${encodeURIComponent(id)}/`);
  }

  private parseProductResponse(raw: string): { data: ProductItem[] } {
    const normalized = raw
      .replace(/"productid"\s*:\s*(\d+)/g, '"productid":"$1"')
      .replace(/"categoryid"\s*:\s*(\d+)/g, '"categoryid":"$1"');
    const parsed = JSON.parse(normalized) as { data?: any[] };
    const data = Array.isArray(parsed?.data)
      ? parsed.data.map((p) => ({
          productid: String(p.productid ?? ''),
          categoryid: String(p.categoryid ?? ''),
          productname: String(p.productname ?? ''),
          qty: Number(p.qty ?? 0),
          price: Number(p.price ?? 0),
          discount: Number(p.discount ?? 0),
          image1: String(p.image1 ?? ''),
          productgroup: String(p.productgroup ?? p.productGroup ?? ''),
        }))
      : [];
    return { data };
  }

  private toApiPayload(body: ProductItem): Record<string, unknown> {
    const group = String(body.productgroup ?? '').trim();
    return {
      productid: String(body.productid ?? ''),
      categoryid: String(body.categoryid ?? ''),
      productname: String(body.productname ?? ''),
      qty: Number(body.qty ?? 0),
      price: Number(body.price ?? 0),
      discount: Number(body.discount ?? 0),
      image1: String(body.image1 ?? ''),
      productgroup: group,
      productGroup: group,
    };
  }
}
