import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import {COOKIE,validSession} from "@/lib/auth";
import Login from "@/components/Login";
export default async function Page(){if(validSession((await cookies()).get(COOKIE)?.value))redirect("/");return <Login/>;}
