import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { map } from 'rxjs/operators';

export interface UserItem {
  userid: string;
  username: string;
  userpassword: string;
  useremail: string;
  verifycode: string;
  verifydate: string;
  userstatus: string;
  usergroup: string;
}

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly endpoint = 'https://salareanit.com/api/posuser/';

  constructor(private http: HttpClient) {}

  GetAllUser(group = 'sv5-theng_rithy') {
    return this.http
      .get(`${this.endpoint}?group=${encodeURIComponent(group)}`, { responseType: 'text' })
      .pipe(map((raw) => this.parseUserResponse(raw)));
  }

  PostUser(body: UserItem) {
    return this.http.post(this.endpoint, body);
  }

  PutUser(id: string, body: UserItem) {
    return this.http.put(`${this.endpoint}${encodeURIComponent(id)}/`, body);
  }

  DeleteUser(id: string) {
    return this.http.delete(`${this.endpoint}${encodeURIComponent(id)}/`);
  }

  private parseUserResponse(raw: string): { data: UserItem[] } {
    const normalized = raw.replace(/"userid"\s*:\s*(\d+)/g, '"userid":"$1"');
    const parsed = JSON.parse(normalized) as { data?: any[] };
    const data = Array.isArray(parsed?.data)
      ? parsed.data.map((u) => ({
          userid: String(u.userid ?? ''),
          username: String(u.username ?? ''),
          userpassword: String(u.userpassword ?? ''),
          useremail: String(u.useremail ?? ''),
          verifycode: String(u.verifycode ?? ''),
          verifydate: String(u.verifydate ?? ''),
          userstatus: String(u.userstatus ?? ''),
          usergroup: String(u.usergroup ?? ''),
        }))
      : [];
    return { data };
  }
}
