import { describe, it, expect } from "vitest";
import { sortQuery } from "./sort-href.js";

const parse = (qs: string) => Object.fromEntries(new URLSearchParams(qs));

describe("sortQuery — the column-sort link preserves filter params (#107 Slice 3 fix)", () => {
  it("with no baseParams, carries only status/sort/dir (prior behavior)", () => {
    expect(parse(sortQuery("status", "asc", "Approved"))).toEqual({ status: "Approved", sort: "status", dir: "asc" });
    expect(parse(sortQuery("status", "desc"))).toEqual({ sort: "status", dir: "desc" }); // no status
  });

  it("preserves the consumer's baseParams (view/account/team/q) so sorting doesn't reset them", () => {
    const q = parse(sortQuery("days_in_status", "desc", null, { view: "past_due", account: "acc1", team: "Sparta", q: "1234" }));
    expect(q).toEqual({ view: "past_due", account: "acc1", team: "Sparta", q: "1234", sort: "days_in_status", dir: "desc" });
  });

  it("skips empty/undefined baseParams (a blank filter pins no param)", () => {
    const q = parse(sortQuery("sf_name", "asc", null, { view: "trailers", account: "", team: undefined, q: "" }));
    expect(q).toEqual({ view: "trailers", sort: "sf_name", dir: "asc" });
  });

  it("status/sort/dir win over a colliding baseParams key", () => {
    const q = parse(sortQuery("sf_name", "asc", "Approved", { status: "STALE", sort: "STALE", dir: "STALE" }));
    expect(q).toEqual({ status: "Approved", sort: "sf_name", dir: "asc" });
  });
});
