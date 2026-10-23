import { query } from "./db";
export async function limit(key: string, max: number, seconds: number) {
 const bucket = Math.floor(Date.now()/1000/seconds);
 const [row] = await query(`INSERT INTO personal_admin.limits(key,bucket) VALUES($1,$2) ON CONFLICT(key) DO UPDATE SET bucket=$2,hits=CASE WHEN personal_admin.limits.bucket=$2 THEN personal_admin.limits.hits+1 ELSE 1 END RETURNING hits`,[key,bucket]);
 return row.hits <= max;
}
