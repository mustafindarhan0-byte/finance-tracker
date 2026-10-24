# CODEMAP — карта кода index.html

Сгенерировано `node tools/codemap.cjs` (обновляется само при каждом коммите). 5846 строк, 533 функций, 40 разделов. Номера — строки index.html.

Связи: `node tools/codemap.cjs who <функция>` (что вызывает и кто её вызывает), `find <часть имени>`, `section <часть заголовка>`. Читай index.html кусками по номерам строк отсюда, а не целиком.

## Icons (inline SVG via currentColor — replaces emoji so style/color are ours to control) · L745
Данные: ICON_PATHS L746, CATS L797, CAT_MAP L820, CAT_COLORS L822, AVATAR_GRADIENTS L830, KEYWORDS L843, CUR_SYM L861
ico L788, icoInline L793, catColor L824, statsColor L826, avatarGradient L834, personBadge L838

## Firestore-backed storage (replaces IndexedDB; store names/keys mirror the old object stores) · L885
Данные: EXTRA_STORES L887, ALL_STORES L888, STORE_KEY_FIELD L889
docId L890, serverTs L896, stamped L897, tombstone L898, trackWrite L899, commitBatch L905, docRef L906, batchPut L907, batchDel L908, batchGoalInc L910, batchSetting L915, batchXp L920, colCacheDel L929, dbPut L930, dbDel L931, countRead L932, syncKey L933, readSyncMark L934, writeSyncMark L937, dbAll L943, dbAllInner L947, clearSyncMarks L968, checkRemoteReset L970, renderSyncState L978, dbClear L985

## Sync setup (space = your data, addressed by a hash of your access code) · L994
Данные: APPCHECK_SITE_KEY L1004
generateCode L995, sha256Hex L999, ensureAuth L1008, withTimeout L1017, deviceLabel L1018, memberKey L1023, ensureSpaceDoc L1025, ensureMember L1033, ensureMembership L1044, showDevices L1050, revokeDevice L1061, connectSpace L1066, readLegacyIndexedDB L1090, hasAnyLegacyData L1109, downloadLegacyBackup L1110, uploadLegacyData L1115, showCodeModal L1127, copyCode L1136, confirmCodeSaved L1140, showMyCode L1147, createNewSpace L1153, joinExistingSpace L1174, syncNow L1198

## Cache · L1211
getTxs L1212, dirtyTx L1216, txCacheRemove L1217

## Utils · L1219
Данные: W_OPS L1231, ERR_OFFLINE_WRITE L1234, ERR_TEXTS L1235, ERR_OFFLINE_CODES L1252, MONTHS_SHORT_RU L1270, MONTHS_NOM_RU L1271, MONTHS_PREP_RU L1272
fmt L1220, fmtCur L1221, localDate L1222, today L1223, uid L1224, getCat L1225, escapeHtml L1226, plural L1229, nWord L1230, errCode L1253, errText L1254, ymdShift L1273, dateRange L1277, filterPeriod L1290, periodLabel L1292, periodPhrase L1301, dayMonthShort L1309, formatDateShort L1316, fitTextSize L1323, fitText L1330, fitAll L1339, labelPeriodTabs L1341

## Toast · L1343
toast L1344, toastUndo L1350, undoTx L1358, showWarning L1369

## Classifier · L1375
Данные: CAT_TYPE L1387, MCC_MAP L1393, PERSON_NAME_RE L1414
parseInput L1376, parseAmt L1385, classifyByMCC L1406, classify L1416, learnCategory L1433

## Solutions to defer to Pro version · L1443
tickFit L1447, refreshDashboard L1452, setPeriod L1474

## Smart Input · L1476
setType L1477, handleSmartInput L1486, showFallbackGrid L1504, selectFallbackCat L1520, saveFallback L1526, currentBank L1538, setCurrentBank L1539, renderCmdBanks L1544, saveTx L1548

## Templates · L1558
renderTemplates L1559, useTmpl L1570, openTmplModal L1580, closeTmplModal L1585, saveTemplate L1587

## Budget · L1599
checkBudget L1600

## History · L1618
historyFilteredTxs L1619, setHistorySearch L1625, refreshHistory L1626, setHistoryPeriod L1644, setHistoryBank L1651, renderHistoryCalendar L1652, shiftHistoryCalMonth L1675, selectHistoryDay L1682, exportHistoryFiltered L1686, deleteTx L1694

## Stats · L1696
Данные: TOOLTIP_STYLE L1782
refreshStats L1697, buildRing L1745, ringHot L1762, sphereShow L1763, sphereReset L1768, sphereToggle L1774, renderCharts L1783, setStatsPeriod L1800, setStatsMonth L1806

## Plans · L1813
Данные: PLAN_SEGS L1815
showPlanSeg L1816, switchSubTab L1823, showAddPlanForm L1828, refreshPlans L1834, planRing L1842, renderHomeBudgetRing L1846, refreshBudgets L1860, saveBudget L1877, delBudget L1886, registerGoalCategories L1890, contributeToGoal L1897, goalRollback L1901, refreshGoals L1906, saveGoal L1919, addToGoal L1926, deleteGoal L1932

## Statement · L1934
Данные: BANK_NAMES L2028, CSV_HEAD_RE L2501
loadStatement L1936, loadCsvStatement L1943, loadPdfStatement L1965, detectBank L2001, parseKaspiPdf L2030, parseFortePdf L2079, parseHalykPdf L2136, parseFreedomPdf L2225, missRow L2295, setStmtCat L2303, confirmNotDuplicateStatement L2312, extractBalanceKaspiForte L2325, extractBalanceHalyk L2336, extractBalanceFreedom L2343, extractStatementBalance L2360, renderBalanceBanner L2366, applyDetectedBalance L2374, stmtKey L2384, buildTxIndex L2385, takeMatch L2394, matchStatementRows L2397, showPdfResults L2415, parseStmtAmount L2440, stmtValidYmd L2456, parseStmtDate L2459, parseCsvRows L2474, detectCsvDelimiter L2491, csvCellIsData L2502, findCsvHeaderRow L2505, parseCsvTable L2517, countFffd L2526, looksMisdecoded L2527, decodeCsvBuffer L2529, guessCsvColumns L2539, stmtTypeFromCell L2549, stmtRowEntries L2560, analyzeStatement L2573, toggleAllStmt L2610, undoStmtImport L2619, addSelectedStmt L2634

## Settings · L2675
getSetting L2677, saveSetting L2683

## Bank balances · L2688
Данные: BANK_KEYS L2689
bankBalance L2692, setBankBalance L2701, statementPeriodEnd L2708, bankTotals L2716, renderBankBalances L2720, openBankEdit L2749, toggleBankEdit L2754, saveBankBalances L2760, setCurrency L2772

## Backups: snapshots in Firestore (F3.4), external copy + CSV (F3.5), restore «заменить» (F3.6) · L2774
Данные: BACKUP_STORES L2776, BACKUP_KEEP L2777, BACKUP_LABELS L2890
backupKeyField L2779, plainValue L2781, cleanBackupData L2790, backupCounts L2800, buildBackupV2 L2801, parseBackup L2805, stableStr L2820, diffBackup L2828, chunkList L2850, bytesToB64 L2851, b64ToBytes L2852, pipeBytes L2853, encodeSnapshot L2855, decodeSnapshot L2860, splitB64 L2864, dayRu L2865, dayDiff L2866, ruDays L2867, reminderFor L2868, snapshotDue L2872, csvCell L2874, buildTxCsv L2880, lsGet L2891, lsSet L2892, backupReminderText L2893, backupsCol L2894, snapKey L2895, readImportedStatements L2896, collectBackupData L2901, makeSnapshot L2910, createSnapshot L2911, pruneSnapshots L2927, loadSnapshot L2935, maybeAutoBackup L2947, manualSnapshot L2966, snapSummary L2975, showSnapshots L2979, renderBackupSettings L2991, isAppleTouch L3001, deliverFile L3004, sharePendingFile L3018, markExternalBackup L3026, exportData L3028, exportCsv L3035, reloadAfterBulkChange L3042, importData L3052, readRestoreJob L3067, writeRestoreJob L3068, clearRestoreJob L3069, restoreStash L3071, restorePanel L3085, setRestoreProgress L3086, restoreFromFile L3087, restoreFromSnapshot L3093, startRestore L3100, renderRestorePlan L3115, cancelRestore L3137, restoreOpToBatch L3143, applyRestore L3152, resumeRestore L3191, clearAll L3198

## F6.6 first run · F6.7 bottom sheet · F6.9 launch shortcuts · L3212
Данные: STARTER_PACK L3216, COUNT_FORMS L3269, LAUNCH_VIEWS L3281, FIRST_RUN_STEPS L3301, NATIVE_CONFIRM L3325
starterPackDocs L3254, countsText L3271, importSummary L3275, launchIntent L3282, sheetMessage L3289, sheetNextFocus L3291, firstRunStateFrom L3293, firstRunChecklistHtml L3308, sheetNative L3327, sheetConfirm L3331, sheetPrompt L3336, sheetQueue L3342, sheetEl L3347, sheetOpen L3348, firstRunKey L3400, starterPackPending L3402, installStarterPack L3407, offerStarterPack L3421, firstRunStateSync L3439, firstRunChecklistState L3445, firstRunHide L3452, firstRunAct L3453

## Tasks & habits: data and logic · L3464
Данные: LISTS L3465
listName L3466, dirtyTasks L3468, getCol L3471, dirtyCols L3476, colPut L3477, colDel L3482, getTasks L3487, getHabits L3488, getChecks L3489, getTaskLog L3490, cachePut L3491, pad2 L3494, parseLocalDate L3495, addDays L3496, isoWeekday L3497, nextOccurrence L3500, nextDue L3521, completeTask L3525, completeTaskInner L3531, toastUndoTask L3552, undoTask L3559, habitStreak L3575, toggleHabit L3582, toggleHabitInner L3587, setHabitSphere L3604, addHabit L3610, archiveHabit L3617, formatTaskDate L3625

## Tasks screen · L3631
Данные: QUICK_LISTS L3777, QUICK_WEEKDAYS L3778
refreshTasks L3633, cmpTasks L3637, upcomingEvents L3641, taskRowHtml L3653, taskTap L3668, openSalaryAllocation L3676, taskEditHtml L3677, renderTasks L3699, toggleTasksLater L3738, toggleHabitsEdit L3739, editTask L3740, taskRepeatChanged L3741, saveTaskEdit L3746, deleteTask L3769, parseQuickDate L3779, parseQuickTask L3796, addQuickTask L3810

## Game layer: XP, levels, ranks, cooling, seasons, achievements · L3821
Данные: SPHERES L3822, SPHERE_OF_LIST L3823, COOL_DAYS L3873, SEASONS L3914, ACHIEVEMENTS L3923
xpToNext L3824, cumXp L3825, levelOf L3826, levelInfo L3827, rankOf L3828, nextRankAt L3829, daysBetween L3830, weekStart L3831, xpTotals L3833, levelsNow L3838, refreshStatusIfVisible L3842, notifyLevelChange L3843, awardXp L3850, revokeXp L3860, coolWindow L3874, sphereActivityDates L3875, sphereIdleDays L3880, coolingInfo L3885, returnBonusActive L3895, xpWithBonus L3903, runCooling L3907, coolingWarnings L3911, seasonNow L3920, getAchievements L3937, checkAchievements L3940

## Journal & command line ([+]) · L3974
Данные: TAG_SPHERE L3975
sphereColor L3976, hhmm L3977, extractJournal L3978, addJournal L3983, deleteJournal L3990, renderJournalToday L3994, createTask L4000

## F6 pure helpers: [+] dates and no-amount hint, task actions, status tiles, salary (tests/status_cmd.cjs) · L4008
Данные: MONTHS_SHORT L4009, CMD_TASK_VERB L4051
isYmdValid L4010, cmdDateValue L4016, cmdDatePick L4022, cmdDateLabel L4028, cmdFixAmountToken L4035, cmdHasKeyword L4041, cmdNoAmountHint L4057, cmdEnterAction L4070, isSalaryTask L4076, taskActionKind L4078, taskTapAction L4080, workoutOpenDecision L4086, statusTileTarget L4095, allocBudgetQuestion L4097, findRecordedSalary L4102, todaySpend L4108, cmdKindLabel L4119, weekAhead L4130, refreshActive L4148, openCmd L4154, closeCmd L4169, cmdSetType L4176, cmdSetList L4180, cmdCurDate L4181, renderCmdDates L4182, cmdSetDate L4187, cmdSyncRows L4196, cmdParse L4207, cmdChipHtml L4229, cmdUpdate L4238, cmdKey L4246, cmdSubmit L4251, cmdApplyHint L4261, cmdSaveHintAsTask L4266, cmdEditPart L4271, cmdShowCats L4280, cmdFlipType L4294, cmdPickCat L4300, cmdSave L4310, cmdSaveInner L4315

## Module 3: installments (рассрочки) · L4335
fmtNum L4336, nextPayDate L4337, debtLastPayment L4338, refreshDebts L4343, toggleDebtForm L4344, renderDebts L4345, saveDebt L4376, deleteDebt L4386

## Module 4: salary allocation · L4427
getAllocScheme L4428, refreshAlloc L4430, renderAlloc L4436, allocSave L4458, allocSetLife L4459, allocAdd L4460, allocSet L4461, allocMove L4462, allocDel L4463, allocPlan L4465, allocPreview L4479, allocConfirm L4494

## Module 5: workouts and body weight · L4525
Данные: WK_MAX_KG L4528, EXTRA_EXERCISES L4600
wcol L4527, isKg L4529, isRep L4530, fmtKg L4531, wkAllSets L4532, wkDate L4533, parseKg L4535, parseRepsVal L4542, wkClean L4550, wkFirstOpen L4554, lastDoneEntry L4556, lastWeightedEntry L4563, suggestWeight L4565, workoutSummary L4573, staleWorkout L4584, refreshBody L4588, planById L4593, pendingWorkoutTask L4595, exerciseCatalog L4609, installTrainingProgram L4615, newPlan L4626, editPlan L4627, closePlanEdit L4628, planEditField L4629, planEditName L4635, planEditRemove L4636, planEditMove L4637, openExPicker L4638, pickCatalogExercise L4640, pickCustomExercise L4644, addExerciseTo L4649, savePlanEdit L4663, deletePlan L4672, exPickerHtml L4678, planEditorHtml L4685, startWorkout L4708, resumeWorkout L4714, dropWorkout L4718, openWorkoutTask L4724, wkSave L4735, wkInputIdx L4737, setWeight L4738, setReps L4747, wkHint L4758, wkCaption L4762, wkListHtml L4767, wkPaint L4771, pickExercise L4777, finishWorkout L4778, closeWorkoutSummary L4792, cancelWorkout L4793, saveBodyWeight L4797, sparkline L4803, wkSummaryHtml L4810, wkStaleHtml L4817

## Body 2.0 · B1: muscle map · L4825
Данные: MUSCLES L4827, EXERCISE_MUSCLES L4834, MUSCLE_WORDS L4855, CALF_NECK_WORDS L4856, WEEKLY_SETS_TARGET L4900, BODY_SHAPES L4904, MIRROR_SKIP L4919
exerciseMuscles L4857, muscleLoad L4866, muscleRecovery L4881, muscleVerdict L4901, bodyPolys L4920

## Body 2.0 · B2: skill tree («Путь») · L4928
Данные: MAJOR_MUSCLES L4931, SKILL_TREES L4932, BODY_GOAL_KG L4957
avgBodyWeight L4958, bestStreak L4962, liftBest L4968, repsBest L4972, volumeWeeks L4976, evaluateSkillTree L4986, skillData L5015, checkSkills L5021, selectSkill L5035, renderSkillPath L5036, setBodySeg L5061, bodySegHtml L5062, bodyFigureSvg L5065, renderBodyMap L5072, selectMuscle L5105, renderBody L5107

## Shell: navigation, money sub-tabs, quest tabs · L5152
Данные: MONEY_VIEWS L5154, MONEY_LABELS L5155, MONEY_CHILD L5156, PLAN_ALIAS L5157
navKeyOf L5159, reducedMotion L5163, fxViewTransition L5164, moveLamp L5168, switchView L5175, closeSettings L5205, buildMoneyTabs L5206, updateMoneyTabs L5217, setQuestTab L5219, moveQInd L5227, showAchievementPlaque L5232

## Status screen (hero, bento, daily quest) · L5237
Данные: MONTHS_GEN L5241, WD_SHORT L5242
xpLogSync L5238, xpTotalsSync L5239, coolingSync L5240, dayWord L5243, refreshStatus L5246, statusSummary L5253, statusMoneyHtml L5260, renderStatus L5267, openSphere L5324, playStatusIntro L5334, setAvatar L5343, resetAvatar L5356

## Quests → Season · L5358
Данные: ACH_ICON L5359
renderSeason L5360

## Quests → Week · L5379
Данные: WD_FULL L5393
weekShift L5381, setWeekMode L5382, weekSegHtml L5384, weekNavHtml L5389, renderWeekAhead L5394, weekDayTap L5407, renderWeek L5411, copyWeek L5456

## F3.3 Data integrity check: pure part (tests/integrity.cjs loads it from here up to the UI marker) · L5462
Данные: INTEGRITY_CLASSES L5463, XP_KNOWN_PREFIXES L5464
isYmd L5465, checkInvariants L5473

## F3.3 Data integrity check: UI · L5671
Данные: INTEGRITY_SEV L5673
integrityLoad L5674, runIntegrityCheck L5680, renderIntegrity L5689, integrityFixText L5704, integrityBeforeFix L5718, integrityDelTasks L5726, integrityApply L5730, integrityFix L5752, integrityFixClass L5763

## Init · L5795
startApp L5796, init L5825

## fx.js (эффекты)
fxRM L11, fxScramble L18, fxTicker L35, fxFlash L52, fxQuestDone L59, fxFly L82, fxDraw L91, fxMarquee L123, fxLevelUp L135, fxAchievement L192, fxBoot L199
