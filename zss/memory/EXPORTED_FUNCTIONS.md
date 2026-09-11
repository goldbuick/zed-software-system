# MEMORY exported functions

Generated from `export function` / `export const` under `zss/memory/`.

## boardaccess.ts

- **READ_LAYER** (`ANY` | `TERRAIN` | `OBJECT` | `ANYGHOST` | `OBJECTGHOST`) — required third arg for `memoryreadelement`
- **memoryreadidorindex**, **memoryboardelementindex**, **memoryreadelement**, **memorypicknearest**, **memorylistelement**, **memoryfindboardplayer**, **memoryreadplayersonboard**

## boardcornerexits.ts

- **memorycornerexitboardids**

## boarddepth2exits.ts

- **memorydepth2exitboardids**

## boarddirection.ts

- **memoryevaldir**

## boarddrawdirty.ts

- **memorycodehasdrawdisplay**, **memoryelementdrawreadid**, **memoryinvalidatedraw**, **memoryupdatedrawdirty**

## boardelement.ts

- **memoryapplyboardelementcolor**, **memoryexportboardelement**, **memoryimportboardelement**, **memoryboardelementisobject**, **memorycopyelementkinddata**, **memorycreateboardelement**

## boardlifecycle.ts

- **memorydeleteboardobject**, **memoryunlinkboardobject**, **memoryexportboard**, **memoryimportboard**, **memorycreateboardobject**, **memorycreateboardobjectfromkind**, **memoryelementisingroup**, **memoryelementmatchesstrgroup**, **memoryelementmatchesstrgrouponboard**, **memoryreadgroup**, **memorywriteterrain**, **memorywriteterrainfromkind**, **memorysafedeleteelement**, **memorycreateboard**

## boardlighting.ts

- **memoryboardlightingapplyobject**, **memoryboardlightingmarkplayer**

## lightstat.ts

- **memorystrdirfromdelta**, **memorywritelightstat**, **memoryparselightstatvalue**, **memoryreadlightpsetargs**, **memoryclearlightstat**

## boardlookup.ts

- **memorywriteboardnamed**, **memorydeleteboardobjectnamedlookup**, **memoryensureterraincoords**, **memoryensureboardready**, **memoryrebuildboardnamed**, **memoryinitboardnamed**, **memorydeleteboardterrainnamed**

## boardmovement.ts

- **memorycheckblockedboardobject**, **memorycheckmoveboardobject**, **memorycleanupboard**, **memorymoveboardobject**, **memorymoveobject**

## boards.ts

- **memoryclearelementkinddata**, **memoryreadelementkind**, **memoryreadelementstat**, **memorycheckelementpushable**, **memorymorphboardobject**, **memorywriteelementfromkind**, **memorywritebullet**, **memoryreadboardbyaddress**, **memoryreadoverboard**, **memoryreadunderboard**, **memoryreadboardbyevaldir**, **memoryinitboard**

## boardterrainmap.ts

- **memorystripterrainkinddefaults**, **memoryexportterrainelement**

## boardtick.ts

- **memorytickboard**

## boardtransitions.ts

- **memoryplayerblockedbyedge**, **memoryplayerwaszapped**, **memoryptwithinboard**

## boardvisuals.ts

- **memoryupdateboardvisuals**

## bookidremap.ts

- **remapbookidsforfilenamesafety**, **remapcodepageidsforfilenamesafety**

## bookmarkdeleteconfirm.ts

- **memorycachebookmarkscrolllist**, **memorycacheeditorbookmarkscrolllist**, **memorycacheterminalbookmarkdelete**, **memoryreadbookmarklistcache**, **memorybookmarkdeleteprompt**

## bookmarkscroll.ts

- **memorymainbookisempty**, **memorybookmarkscroll**

## bookoperations.ts

- **memoryreadelementcodepage**, **memorydeletecodepage**, **memoryclearflags**, **memoryreadelementdisplay**, **memoryensurecodepage**, **memoryexportbook**, **memoryhasflags**, **memoryimportbook**, **memoryreadcodepage**, **memorylistcodepage**, **memoryreadflag**, **memoryreadflags**, **memoryupdatebookname**, **memoryupdatebooktoken**, **memorywritecodepage**, **memoryupsertcodepage**, **memorywriteflag**, **memorycreatebook**

## books.ts

- **memorycreatesoftwarebook**, **memoryensurebookbyname**, **memoryensuremainbook**, **memoryensuremaincodepage**

## bookzstd.ts

- **bookzstdcompressbase64url**, **BOOK_ZSTD_LEVEL**

## codelabels.ts

- **memorycollectcodelabels**

## codepageoperations.ts

- **memoryapplyelementstats**, **memoryexportbitmap**, **memoryimportbitmap**, **memoryexportcodepage**, **memoryimportcodepage**, **memoryfreecodepage**, **memoryreadcodepagedata**, **memoryreadcodepagename**, **memoryreadcodepagestat**, **memoryreadcodepagestatdefaults**, **memoryreadcodepagestats**, **memoryreadcodepagestatsfromtext**, **memoryreadcodepagetype**, **memoryreadcodepagetypeasstring**, **memoryresetcodepagestats**, **memorycodepagetypetostring**, **memorycreatecodepage**

## codepagepickcache.ts

- **memoryreadcodepagepickcache**, **memorywritecodepagepickcache**, **memoryinvalidatecodepagepickcache**

## codepages.ts

- **memorypickcodepage**

## editorbookmarkscroll.ts

- **memoryeditorbookmarkshorttitle**, **memoryeditorbookmarkscroll**

## exportflagcache.ts

- **memoryexportshouldskipflagowner**

## exportidremap.ts

- **collectflagprotectedids**, **buildexportidremap**, **applyexportidremap**, **mintcompressedexportids**

## gadgetlayersflags.ts

- **memoryresetbookgadgetlayersreadcache**, **memoryreadbookgadgetlayersforboard**

## gamesend.ts

- **memorybulletcollisionlabel**, **memorysendtoboards**, **memorysendtoelement**, **memorysendtoelements**

## inspection.ts

- **memoryinspectboardlines**, **memoryinspectloaderlines**, **memoryinspect**, **memoryinspectarea**, **memoryinspectcommand**, **memoryinspectelement**, **memoryinspectempty**, **memoryinspectemptymenu**

## inspectionbatch.ts

- **memoryhassecretheap**, **memoryinspectbatchcommand**, **memoryinspectcopy**, **memoryinspectcopymenu**, **memoryinspectcut**, **memoryinspectcutmenu**, **memoryinspectpaste**, **memoryinspectpastemenu**, **memoryreadsecretheap**

## inspectionconfig.ts

- **memorycreateinspectionconfig**

## inspectionfind.ts

- **memoryfindany**, **memoryfindanymenu**

## inspectionmakeit.ts

- **memorymakeitcommand**, **memorymakeitscroll**

## inspectionremix.ts

- **memoryinspectremixcommand**, **memoryinspectremixmenu**

## inspectionstyle.ts

- **memoryinspectstyle**, **memoryinspectstylemenu**

## jsonpipefilter.ts

- **memoryrootshouldemitpath**

## lightinggeometry.ts

- **lightingmixmaxrange**, **memorylightingaddrangetoblocked**, **LIGHTING_RAY_TILE_YSCALE**, **LIGHTING_OBJECT_OCCLUDER_CELL_FRAC**

## loader.ts

- **memoryloaderreadcontextapply**, **memoryloaderreadcontextsave**, **memoryloaderrelease**, **memoryloader**, **memoryloaderarg**, **memoryloadercontent**, **memoryloaderformat**, **memoryloadermatches**

## permissions.ts

- **memorycheckpermissioncommand**, **memorymapcommandtofamily**, **memoryplayerallowedcommand**, **memorycanruncommand**, **memorywriteplayertotoken**, **memorywritecommandpermissions**, **memoryistokenbanned**, **memorybantoken**, **memoryunbantoken**, **memoryreadbannedtokens**, **memoryreadplayertotoken**, **memoryreadallowlistbyrole**, **memoryreadallowlistbreakdownbyrole**, **memoryreadrolebytoken**, **memoryallowcommand**, **memoryrevokecommand**, **memorywriterolefortoken**, **memoryreadpermissionconfig**, **memoryapplypermissionconfig**, **memoryserializepermissions**, **PERMISSION_CONTROLLED_GROUPS**, **PERMISSION_CONFIG_NAMES**

## playermanagement.ts

- **memorydebugcountplayerboards**, **memorypurgeplayerboardcopies**, **memorymoveplayertoboard**, **memoryreadbookplayeractive**, **memoryreadbookplayerboards**, **memorywritebookplayerboard**, **memoryloginplayer**, **memoryswitchopenedbook**, **memoryreopenaftertrash**, **memorylogoutplayer**, **memoryscanplayers**, **memoryreadplayeractive**, **memoryreadplayerboard**, **memorypicknextactiveplayerboard**

## rendering.ts

- **memorycodepagetoprefix**, **memoryconverttogadgetcontrollayer**, **memoryinvalidategadgetlayerscacheforboard**, **memoryincrementallayerscachestable**, **memoryappendboardtickers**, **memoryconverttogadgetlayers**, **memoryreadgraphics**, **memoryelementtodisplayprefix**, **memoryelementtologprefix**, **memoryelementtotickerprefix**, **memoryreadgadgetlayers**

## runtime.ts

- **memorychipispresent**, **memoryhaltchip**, **memoryhaltallchips**, **memoryrestartallchipsandflags**, **memorymessagechip**, **memoryrepeatclilast**, **memorytickloaders**, **memorytickmain**, **memorytickobject**, **memorytickonce**, **memoryruncli**, **memoryruncodepage**, **memoryunlockscroll**, **memoryapplyboardsynthstats**

## session.ts

- **memoryreadloaders**, **memorystartloader**, **memoryreadsession**, **memorywritesession**, **memoryreadoperator**, **memoryisoperator**, **memorywriteoperator**, **memoryreadtopic**, **memorywritetopic**, **memorywritehalt**, **memoryreadhalt**, **memorywritefrozen**, **memoryreadfrozen**, **memoryreadbooklist**, **memoryreadfirstbook**, **memoryreadbookbyaddress**, **memorywritemainbook**, **memoryreadmainbook**, **memoryresetbooks**, **memorywritebook**, **memoryfreebook**, **memoryclearbook**, **memoryreadfirstcontentbook**, **memoryreadroot**

## spatialqueries.ts

- **memorycheckcollision**, **memoryfindplayerforelement**, **memorylistboardptsbyempty**, **memoryreadboardpath**

## synthstate.ts

- **memoryreadsynth**, **memorymergesynthvoice**, **memorymergesynthvoicefx**, **memoryreadsynthplay**, **memoryqueuesynthplay**

## trimexport.ts

- **trimmemoryexport**, **trimformatobject**

## types.ts

- **BOARD_WIDTH**, **BOARD_HEIGHT**, **BOARD_SIZE**, **CHAR_RAY_MARGIN**, **FIXED_DATE**, **CORNER_EXIT_DISPUTED**

## utilities.ts

- **memorysetconfig**, **memoryreadconfig**, **memoryreadconfigall**, **memorywriteconfig**, **memoryadminmenu**, **memorycompressbooks**, **memorydecompressbooks**
