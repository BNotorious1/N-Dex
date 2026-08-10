import {Q as ie, a as de} from "./QBreadcrumbs.80775a32.js";
import {Q as j} from "./QTab.8fc851d1.js";
import {Q as me} from "./QTabs.74518730.js";
import {Q as A} from "./QTd.c131b809.js";
import {Q as G} from "./QImg.0724f296.js";
import {Q as ue} from "./QTable.632a60ca.js";
import {a as H, Q as fe} from "./QTabPanels.351716b3.js";
import {Q as pe} from "./QPage.4d48fe05.js";
import {d as ce, N as ae, C as f, k as _e, v as M, y as ge, z as be, A as ve, c as S, w as o, aS as ye, _ as te, n as F, aW as le, o as s, e, a as r, Q as ke, h as P, W, aU as B, aT as O, t as y, f as g, F as Y, g as K, D as Te, br as Ne, a2 as Pe, r as h, E as Z} from "./index.2072ca6c.js";
import {Q as J} from "./QSelect.72719787.js";
import {Q as we} from "./QInnerLoading.dce78f65.js";
import {F as X, a as ee} from "./format.d9332607.js";
import {u as De} from "./useRecapGraphic.bebc94f5.js";
import {S as re} from "./SeasonOptions.415f7a9a.js";
import {l as Qe} from "./leagueSeasonContext.def719ab.js";
import {F as Re} from "./FilterForm.4fe1d9a3.js";
import {P as he} from "./Positions.af983cc0.js";
import {P as Se} from "./PlayerColumn.77b6bc26.js";
import {u as Ce} from "./use-meta.4fb66eb8.js";
import {i as Oe, g as Ve, u as Ie} from "./parameters.37341641.js";
import {_ as qe} from "./LeagueSectionHeader.278536eb.js";
import "./QResizeObserver.5587aaa5.js";
import "./QList.8d742b77.js";
import "./QMarkupTable.4703cf99.js";
import "./QLinearProgress.8e3ad5e0.js";
import "./use-fullscreen.7117427c.js";
import "./use-panel.e9102abe.js";
import "./use-render-cache.3aae9b27.js";
import "./QChip.b4e1c8b8.js";
import "./QItem.b7a0a91e.js";
import "./QItemLabel.152ddc5a.js";
import "./QMenu.3c46c153.js";
import "./position-engine.995205e8.js";
import "./Madden.5f236acb.js";
import "./index.57998cd0.js";
import "./QDrawer.0fb06197.js";
import "./QScrollObserver.5a4ad40a.js";
import "./QSpace.30b55a5f.js";
import "./ClosePopup.4cc7b83b.js";
import "./Filters.d53b1dee.js";
import "./PlayerIcons.6e82d78e.js";
import "./QTooltip.40552622.js";
import "./league.8c3e0f4c.js";
import "./SectionHeaderImage.101cb9c2.js";
const $e = {
    class: "q-mb-sm"
}
  , Ae = {
    class: "row q-col-gutter-sm q-mt-none"
}
  , Be = {
    class: "col-6"
}
  , Fe = {
    class: "col-6"
}
  , Ue = {
    class: "q-mb-sm"
}
  , xe = {
    id: "draft-recap-container"
}
  , Ee = {
    id: "draft-recap-top"
}
  , ze = {
    id: "draft-recap-top__title"
}
  , Le = {
    id: "draft-recap-top__highlight"
}
  , je = {
    key: 0,
    id: "draft-recap-empty"
}
  , Ge = {
    key: 1,
    id: "draft-recap-body"
}
  , He = ["src", "alt"]
  , Me = ["src", "alt"]
  , We = {
    class: "draft-pick-row__name"
}
  , Ye = {
    class: "draft-pick-row__pos"
}
  , Ke = {
    class: "draft-pick-row__ovr"
}
  , Ze = ce({
    __name: "DraftRecap",
    props: {
        league: {
            type: Object,
            required: !0
        }
    },
    setup(t) {
        var L;
        const i = t
          , w = [1, 2, 3, 4, 5, 6, 7]
          , n = F("api")
          , V = ae()
          , {backgroundImage: k, handleImage: D, save: b} = De();
        k.value = (L = i.league.background_image) != null ? L : null;
        const p = f(null);
        function T() {
            return "linear-gradient(90deg, #111 0%, rgba(0,0,0,0) 50%, #111 100%)"
        }
        function v() {
            const m = p.value;
            m && b(m, "draft-recap.jpeg", _.value || "Draft Recap")
        }
        const a = f([])
          , _ = f("")
          , C = f(!1)
          , c = f(!1)
          , R = f(1)
          , N = f(i.league.calendar_year)
          , oe = re(i.league.calendar_year, !1)
          , Q = F(Qe, null)
          , U = Symbol("draft-recap-season");
        let I = !0;
        function x() {
            I && (Q == null || Q.update(U, N.value))
        }
        function E() {
            Q == null || Q.remove(U)
        }
        const q = _e( () => {
            const m = a.value.filter(d => d.draftedTeam)
              , l = Math.ceil(m.length / 2);
            return [m.slice(0, l), m.slice(l)]
        }
        );
        let $ = 0;
        function z() {
            const m = ++$;
            c.value = !0,
            n.get(`/leagues/${V.params.abbrev}/draft/?size=0&player__rookieYear=${N.value}&player__draftRound=${R.value}`).then( ({data: l}) => {
                m === $ && (a.value = l,
                C.value || (_.value = `${i.league.name} - ${N.value} Draft`),
                c.value = !1)
            }
            ).catch(l => {
                m === $ && (le(l),
                c.value = !1)
            }
            )
        }
        function ne() {
            var m;
            k.value = (m = i.league.background_image) != null ? m : null
        }
        return M(N, x, {
            immediate: !0
        }),
        M([R, N], () => z()),
        ge( () => {
            I = !0,
            x()
        }
        ),
        be( () => {
            I = !1,
            E()
        }
        ),
        ve(E),
        z(),
        (m, l) => (s(),
        S(ye, null, {
            default: o( () => [e(B, null, {
                default: o( () => [r("div", $e, [e(ke, {
                    modelValue: _.value,
                    "onUpdate:modelValue": [l[0] || (l[0] = d => _.value = d), l[1] || (l[1] = d => C.value = !0)],
                    label: "Title",
                    filled: "",
                    dense: ""
                }, null, 8, ["modelValue"]), r("div", Ae, [r("div", Be, [e(J, {
                    modelValue: R.value,
                    "onUpdate:modelValue": l[2] || (l[2] = d => R.value = d),
                    options: w,
                    label: "Round",
                    filled: "",
                    dense: "",
                    "emit-value": "",
                    "map-options": ""
                }, null, 8, ["modelValue"])]), r("div", Fe, [e(J, {
                    modelValue: N.value,
                    "onUpdate:modelValue": l[3] || (l[3] = d => N.value = d),
                    options: P(oe),
                    label: "Season",
                    filled: "",
                    dense: "",
                    "emit-value": "",
                    "map-options": ""
                }, null, 8, ["modelValue", "options"])])]), l[7] || (l[7] = r("div", {
                    class: "text-caption"
                }, "Custom Background Image", -1)), r("input", {
                    type: "file",
                    accept: "image/*",
                    hint: "Upload Background Image",
                    onChange: l[4] || (l[4] = (...d) => P(D) && P(D)(...d))
                }, null, 32)]), r("div", Ue, [e(W, {
                    label: "Reset Background",
                    icon: "restart_alt",
                    color: "warning",
                    onClick: l[5] || (l[5] = d => ne())
                })])]),
                _: 1
            }), e(B, null, {
                default: o( () => [e(we, {
                    showing: c.value,
                    size: "lg"
                }, null, 8, ["showing"])]),
                _: 1
            }), c.value ? Te("", !0) : (s(),
            S(B, {
                key: 0,
                style: {
                    overflow: "scroll"
                }
            }, {
                default: o( () => [r("div", {
                    id: "draft-recap-wrapper",
                    ref_key: "recapElement",
                    ref: p,
                    style: O(P(k) ? {
                        backgroundImage: "url(" + P(k) + ")"
                    } : {})
                }, [r("span", {
                    id: "draft-bg-gradient",
                    style: O({
                        backgroundImage: T()
                    })
                }, null, 4), r("div", xe, [r("div", Ee, [r("span", ze, y(_.value), 1), r("span", Le, "Round " + y(R.value), 1)]), q.value[0].length === 0 && q.value[1].length === 0 ? (s(),
                g("div", je, " No picks found ")) : (s(),
                g("div", Ge, [(s(!0),
                g(Y, null, K(q.value, (d, se) => (s(),
                g("div", {
                    key: se,
                    class: "draft-recap-column"
                }, [(s(!0),
                g(Y, null, K(d, u => (s(),
                g("div", {
                    key: u.player.id,
                    class: "draft-pick-row"
                }, [r("span", {
                    class: "draft-pick-row__number",
                    style: O({
                        backgroundColor: P(X).color(u.draftedTeam.primaryColor)
                    })
                }, y(u.player.draftPick), 5), r("span", {
                    class: "draft-pick-row__logo",
                    style: O({
                        backgroundColor: P(X).color(u.draftedTeam.primaryColor)
                    })
                }, [u.draftedTeam.logo ? (s(),
                g("img", {
                    key: 0,
                    src: u.draftedTeam.logo,
                    alt: `${u.draftedTeam.displayName} logo`
                }, null, 8, He)) : (s(),
                g("img", {
                    key: 1,
                    src: `/images/teamlogos/256/${u.draftedTeam.logoId}.png`,
                    alt: `${u.draftedTeam.displayName} logo`
                }, null, 8, Me))], 4), r("span", We, y(u.player.fullName), 1), r("span", Ye, y(u.draftedPosition), 1), r("span", Ke, y(u.draftedOvr), 1)]))), 128))]))), 128))])), l[8] || (l[8] = r("div", {
                    id: "draft-recap-footer"
                }, [r("img", {
                    src: "/logo.png"
                }), r("span", {
                    id: "draft-recap-footer__title"
                }, "NEONSPORTZ.COM")], -1))])], 4)]),
                _: 1
            })), e(Ne, {
                align: "center"
            }, {
                default: o( () => [e(W, {
                    label: "Download",
                    class: "q-mr-sm",
                    icon: "download",
                    size: "lg",
                    color: "primary",
                    disable: c.value,
                    onClick: l[6] || (l[6] = d => v())
                }, null, 8, ["disable"])]),
                _: 1
            })]),
            _: 1
        }))
    }
});
var Je = te(Ze, [["__scopeId", "data-v-4c8c5a8c"]]);
const Xe = [{
    name: "player__draftRound",
    align: "center",
    label: "Round",
    field: "player",
    format: t => t.draftRound,
    sortable: !1
}, {
    name: "player__draftPick",
    align: "center",
    label: "Pick",
    field: "player",
    format: t => t.draftPick,
    sortable: !1
}, {
    name: "player__fullName",
    align: "left",
    label: "Player",
    field: "player",
    format: t => t.fullName,
    sortable: !1
}, {
    name: "draftedTeam__displayName",
    align: "center",
    label: "Drafted Team",
    field: "draftedTeam",
    sortable: !1
}, {
    name: "player__team__displayName",
    align: "center",
    label: "Team",
    field: "player",
    sortable: !1
}, {
    name: "draftedPosition",
    align: "center",
    label: "Drafted POS",
    field: "draftedPosition",
    sortable: !1
}, {
    name: "player__position",
    align: "center",
    label: "POS",
    field: "player",
    format: t => t.position,
    sortable: !1
}, {
    name: "draftedAge",
    align: "center",
    label: "Drafted Age",
    field: "draftedAge",
    sortable: !1
}, {
    name: "player__age",
    align: "center",
    label: "AGE",
    field: "player",
    format: t => t.age,
    sortable: !1
}, {
    name: "draftedOvr",
    align: "center",
    label: "Drafted OVR",
    field: "draftedOvr",
    sortable: !1
}, {
    name: "player__playerBestOvr",
    align: "center",
    label: "OVR",
    field: "player",
    format: t => t.playerBestOvr,
    sortable: !1
}, {
    name: "draftedDev",
    align: "center",
    label: "Drafted Dev",
    field: "draftedDev",
    format: t => ee.devTrait(t),
    sortable: !1
}, {
    name: "player__devTrait",
    align: "center",
    label: "DEV",
    field: "player",
    format: t => ee.devTrait(t.devTrait),
    sortable: !1
}]
  , ea = {
    name: "DraftDashboard",
    components: {
        LeagueSectionHeader: qe,
        DraftRecap: Je,
        FilterForm: Re,
        PlayerColumn: Se
    },
    props: {
        league: {
            type: Object,
            required: !0
        }
    },
    setup(t) {
        Ce({
            titleTemplate: _ => `${_} - Draft`
        });
        const i = F("api")
          , w = ae()
          , n = Pe()
          , k = `/leagues/${w.params.abbrev}/draft/`
          , D = f("picks")
          , b = f(!0)
          , p = f({
            sortBy: "player__draftRound,player__draftPick",
            descending: !1,
            page: 1,
            rowsPerPage: 32,
            rowsNumber: 32
        })
          , T = f([])
          , v = f([{
            type: "select",
            value: t.league.calendar_year,
            default: t.league.calendar_year,
            field: "player__rookieYear",
            label: "Season",
            options: re(t.league.calendar_year, !1)
        }, {
            type: "select",
            value: null,
            default: null,
            field: "player__draftRound",
            label: "Drafted Round",
            options: [{
                label: "Any",
                value: null
            }, 1, 2, 3, 4, 5, 6, 7],
            force_number: !0
        }, {
            type: "teams",
            field: "draftedTeam__abbrName",
            value: null,
            default: null
        }, {
            type: "select",
            value: null,
            default: null,
            field: "draftedPosition",
            label: "Drafted Position",
            options: he
        }, {
            type: "text",
            value: "",
            default: "",
            field: "player__cleanName",
            label: "Player Name"
        }]);
        function a({pagination: _, filter: C}) {
            b.value = !0,
            i(Ve(k, _, C)).then( ({data: c}) => {
                p.value = _,
                p.value.rowsNumber = parseInt(c.count),
                T.value = c.results,
                b.value = !1,
                Ie(n, v.value, p.value)
            }
            ).catch(c => {
                le(c),
                b.value = !1
            }
            )
        }
        return Oe(w, v.value, p.value),
        a({
            pagination: p.value,
            filter: v.value
        }),
        {
            tab: D,
            serverData: T,
            columns: Xe,
            serverPagination: p,
            filters: v,
            loading: b,
            request: a
        }
    }
}
  , aa = {
    class: "q-pa-sm"
}
  , ta = {
    key: 1
}
  , la = {
    key: 1
};
function ra(t, i, w, n, V, k) {
    const D = h("LeagueSectionHeader")
      , b = h("FilterForm")
      , p = h("PlayerColumn")
      , T = h("router-link")
      , v = h("DraftRecap");
    return s(),
    S(pe, {
        padding: ""
    }, {
        default: o( () => [r("div", aa, [e(de, null, {
            default: o( () => [e(ie, {
                label: "Draft",
                icon: "sports_football"
            })]),
            _: 1
        })]), e(D, {
            section: "draft"
        }), e(me, {
            modelValue: n.tab,
            "onUpdate:modelValue": i[0] || (i[0] = a => n.tab = a),
            class: "q-mb-sm",
            align: "left",
            "active-color": "primary",
            dense: ""
        }, {
            default: o( () => [e(j, {
                name: "picks",
                label: "Picks"
            }), e(j, {
                name: "recap",
                label: "Recap Graphic"
            })]),
            _: 1
        }, 8, ["modelValue"]), e(fe, {
            modelValue: n.tab,
            "onUpdate:modelValue": i[2] || (i[2] = a => n.tab = a),
            animated: "",
            "keep-alive": ""
        }, {
            default: o( () => [e(H, {
                name: "picks"
            }, {
                default: o( () => [e(b, {
                    filters: n.filters
                }, null, 8, ["filters"]), e(ue, {
                    pagination: n.serverPagination,
                    "onUpdate:pagination": i[1] || (i[1] = a => n.serverPagination = a),
                    "rows-per-page-options": [10, 25, 50, 100],
                    title: "Draft Recap",
                    rows: n.serverData,
                    columns: n.columns,
                    filter: n.filters,
                    loading: n.loading,
                    separator: "none",
                    "binary-state-sort": "",
                    dense: "",
                    "hide-pagination": "",
                    onRequest: n.request
                }, {
                    "body-cell-player__fullName": o(a => [e(A, {
                        key: "player__fullName",
                        props: a
                    }, {
                        default: o( () => [e(p, {
                            abbrev: t.$route.params.abbrev,
                            player: a.row.player
                        }, null, 8, ["abbrev", "player"])]),
                        _: 2
                    }, 1032, ["props"])]),
                    "body-cell-draftedTeam__displayName": o(a => [e(A, {
                        key: "draftedTeam__displayName",
                        props: a
                    }, {
                        default: o( () => [a.row.draftedTeam ? (s(),
                        S(T, {
                            key: 0,
                            to: {
                                name: "Team",
                                params: {
                                    abbrev: t.$route.params.abbrev,
                                    abbrName: a.row.draftedTeam.abbrName
                                }
                            }
                        }, {
                            default: o( () => [e(G, {
                                "no-spinner": "",
                                fit: "contain",
                                style: {
                                    width: "25px"
                                },
                                src: "https://cdn.neonsportz.com/teamlogos/256/" + a.row.draftedTeam.logoId + ".png"
                            }, null, 8, ["src"]), Z(" " + y(a.row.draftedTeam.abbrName), 1)]),
                            _: 2
                        }, 1032, ["to"])) : (s(),
                        g("span", ta, "UDFA"))]),
                        _: 2
                    }, 1032, ["props"])]),
                    "body-cell-player__team__displayName": o(a => [e(A, {
                        key: "player__team__displayName",
                        props: a
                    }, {
                        default: o( () => [a.row.player.team ? (s(),
                        S(T, {
                            key: 0,
                            to: {
                                name: "Team",
                                params: {
                                    abbrev: t.$route.params.abbrev,
                                    abbrName: a.row.player.team.abbrName
                                }
                            }
                        }, {
                            default: o( () => [e(G, {
                                "no-spinner": "",
                                fit: "contain",
                                style: {
                                    width: "25px"
                                },
                                src: "https://cdn.neonsportz.com/teamlogos/256/" + a.row.player.team.logoId + ".png"
                            }, null, 8, ["src"]), Z(" " + y(a.row.player.team.abbrName), 1)]),
                            _: 2
                        }, 1032, ["to"])) : (s(),
                        g("span", la, "FA"))]),
                        _: 2
                    }, 1032, ["props"])]),
                    _: 1
                }, 8, ["pagination", "rows", "columns", "filter", "loading", "onRequest"])]),
                _: 1
            }), e(H, {
                name: "recap"
            }, {
                default: o( () => [e(v, {
                    league: w.league
                }, null, 8, ["league"])]),
                _: 1
            })]),
            _: 1
        }, 8, ["modelValue"])]),
        _: 1
    })
}
var Ya = te(ea, [["render", ra]]);
export {Ya as default};
