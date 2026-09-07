import { afterEach, beforeEach, expect, test } from "bun:test";
import { submitLead, trackEvent } from "../src/lib/leads";
const originalFetch=globalThis.fetch;
const originalWindow=globalThis.window;
const originalDocument=globalThis.document;
const calls: {url:string, init?:RequestInit}[]=[];
let reply: unknown;
let status=200;
beforeEach(()=>{
  calls.length=0;reply={ok:true,reference:"TEST0001"};status=200;
  Object.assign(globalThis,{window:{location:new URL("https://example.com/contact"),sessionStorage:{getItem:()=>null,setItem:()=>{}}},document:{referrer:""}});
  globalThis.fetch=(async(url:unknown,init?:RequestInit)=>{
    calls.push({url:String(url),init});
    return new Response(JSON.stringify(String(url).includes("/submit_")?reply:{ok:true}),{status});
  }) as typeof fetch;
});
afterEach(()=>{globalThis.fetch=originalFetch;Object.assign(globalThis,{window:originalWindow,document:originalDocument});});
const input={full_name:"Test person",phone:"2025550100"};
test("requires a positive stored-request receipt, not just HTTP success",async()=>{
  for(const value of [null,{}, {ok:false}, {ok:true}, {ok:true,reference:""}]){
    reply=value;calls.length=0;
    await expect(submitLead(input)).rejects.toThrow("receipt_missing");
    expect(calls.some(c=>c.url.includes("/track_"))).toBe(false);
  }
});
test("records completion only after a received-request reference",async()=>{
  expect(await submitLead(input)).toEqual({ok:true,reference:"TEST0001"});
  const event=calls.find(c=>c.url.includes("/track_"));
  expect(JSON.parse(String(event?.init?.body)).payload.event).toBe("form_submit");
});
test("a failed response does not count as a completed request",async()=>{
  reply={message:"unavailable"};status=503;
  await expect(submitLead(input)).rejects.toThrow("unavailable");
  expect(calls.length).toBe(1);
});
test("contact taps do not count as a received request",()=>{
  trackEvent("call_click",{channel:"call"});
  expect(calls.length).toBe(1);
  expect(JSON.parse(String(calls[0].init?.body)).payload.event).toBe("call_click");
});
test("a broken optional reporting script cannot invalidate receipt",async()=>{
  Object.assign(window,{gtag:()=>{throw Error("tracker broken");}});
  expect((await submitLead(input)).reference).toBe("TEST0001");
});

