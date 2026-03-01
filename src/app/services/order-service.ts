import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map } from 'rxjs/operators';

export interface OrderItem {
  orderid: string;
  orderno: string;
  orderdate: string;
  orderby: string;
  ordergroup: string;
}

export interface OrderDetailItem {
  orderdetailid?: string;
  orderid: string;
  productid: string;
  qty: number;
  price: number;
  discount: number;
  orderdetailgroup: string;
}

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly endpoint = 'https://salareanit.com/api/posorder/';
  private readonly detailEndpoint = 'https://salareanit.com/api/posorderdetail/';

  constructor(private http: HttpClient) {}

  GetAllOrder(group = 'sv5-theng_rithy') {
    return this.http
      .get(`${this.endpoint}?group=${encodeURIComponent(group)}`, { responseType: 'text' })
      .pipe(map((raw) => this.parseOrderResponse(raw)));
  }

  GetAllOrderDetail(group = 'sv5-theng_rithy') {
    return this.http
      .get(`${this.detailEndpoint}?group=${encodeURIComponent(group)}`, { responseType: 'text' })
      .pipe(map((raw) => this.parseOrderDetailResponse(raw)));
  }

  PostOrder(body: OrderItem) {
    return this.http.post(this.endpoint, body);
  }

  PostOrderDetail(body: OrderDetailItem) {
    return this.http.post(this.detailEndpoint, body);
  }

  PutOrder(id: string, body: OrderItem) {
    return this.http.put(`${this.endpoint}${encodeURIComponent(id)}/`, body);
  }

  DeleteOrder(id: string) {
    return this.http.delete(`${this.endpoint}${encodeURIComponent(id)}/`);
  }

  private parseOrderResponse(raw: string): { data: OrderItem[] } {
    const normalized = raw.replace(/"orderid"\s*:\s*(\d+)/g, '"orderid":"$1"');
    const parsed = JSON.parse(normalized) as { data?: any[] };
    const data = Array.isArray(parsed?.data)
      ? parsed.data.map((o) => ({
          orderid: String(o.orderid ?? ''),
          orderno: String(o.orderno ?? ''),
          orderdate: String(o.orderdate ?? ''),
          orderby: String(o.orderby ?? ''),
          ordergroup: String(o.ordergroup ?? ''),
        }))
      : [];
    return { data };
  }

  private parseOrderDetailResponse(raw: string): { data: OrderDetailItem[] } {
    const normalized = raw
      .replace(/"orderdetailid"\s*:\s*(\d+)/g, '"orderdetailid":"$1"')
      .replace(/"orderid"\s*:\s*(\d+)/g, '"orderid":"$1"')
      .replace(/"productid"\s*:\s*(\d+)/g, '"productid":"$1"');
    const parsed = JSON.parse(normalized) as { data?: any[] };
    const data = Array.isArray(parsed?.data)
      ? parsed.data.map((d) => ({
          orderdetailid: d.orderdetailid != null ? String(d.orderdetailid) : undefined,
          orderid: String(d.orderid ?? ''),
          productid: String(d.productid ?? ''),
          qty: Number(d.qty ?? 0),
          price: Number(d.price ?? 0),
          discount: Number(d.discount ?? 0),
          orderdetailgroup: String(d.orderdetailgroup ?? ''),
        }))
      : [];
    return { data };
  }
}
