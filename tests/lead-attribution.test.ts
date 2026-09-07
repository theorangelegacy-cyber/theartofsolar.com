import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { firstArrival } from "../src/lib/lead-attribution";
const storage = new Map<string,string>();
const oldWindow = globalThis.window;
const oldDocument = globalThis.document;
beforeEach(() => {
  storage.clear();
  Object.assign(globalThis, {
    window: { location: new URL("https://example.com/services/kitchen?utm_source=google&utm_medium=cpc&email=private@example.com&gclid=private-click"), sessionStorage: {getItem:(key:string)=>storage.get(key)??null,setItem:(key:string,value:string)=>storage.set(key,value)} },
    document: { referrer: "https://www.google.com/search?q=private+details" },
  });
});
afterEach(() => { Object.assign(globalThis, {window:oldWindow,document:oldDocument}); });
describe("first arrival", () => {
  test("keeps the discovery page through a later contact visit", () => {
    const first=firstArrival();
    window.location = new URL("https://example.com/contact") as unknown as Location;
    expect(firstArrival()).toEqual(first);
    expect(first.landing_path).toBe("/services/kitchen");
  });
  test("saves no arbitrary query, search terms or ad click IDs", () => {
    const source=firstArrival();
    expect(source.referrer).toBe("https://www.google.com");
    expect(source.utm_source).toBe("google");
    expect(JSON.stringify(source)).not.toContain("private");
    expect(JSON.stringify([...storage.values()])).not.toContain("private");
  });
  test("does not accept personal data as campaign attribution", () => {
    window.location = new URL("https://example.com/contact?utm_source=person@example.com&utm_medium=my+name") as unknown as Location;
    expect(firstArrival().utm_source).toBeNull();
    expect(firstArrival().utm_medium).toBeNull();
  });
  test("works with blocked storage and malformed saved values", () => {
    storage.set("commercial_arrival_v1","broken");
    expect(firstArrival().landing_path).toBe("/services/kitchen");
    window.sessionStorage.getItem=()=>{throw Error("blocked");};
    expect(firstArrival().landing_path).toBe("/services/kitchen");
  });
  test("keeps valid campaign codes and click IDs through navigation", () => {
    window.location = new URL("https://example.com/services/kitchen?utm_campaign=fall-2026&gclid=Cj0KCQjABCDEFGHIJKLmnopQRST12345") as unknown as Location;
    const first = firstArrival();
    window.location = new URL("https://example.com/contact") as unknown as Location;
    expect(firstArrival().utm_campaign).toBe("fall-2026");
    expect(firstArrival().gclid).toBe(first.gclid);
    expect(first.gclid).toBe("Cj0KCQjABCDEFGHIJKLmnopQRST12345");
  });
  test("corrupt saved attribution fields cannot erase a valid first page", () => {
    storage.set("commercial_arrival_v1",JSON.stringify({landing_path:"/first-page",referrer:123,utm_source:33,utm_medium:{},utm_campaign:[],gclid:{}}));
    const arrival = firstArrival();
    expect(arrival.landing_path).toBe("/first-page");
    expect(arrival.utm_source).toBeNull();
    expect(arrival.utm_medium).toBeNull();
    expect(arrival.utm_campaign).toBeNull();
    expect(arrival.gclid).toBeNull();
  });
});
