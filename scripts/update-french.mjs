// Builds the French meanings of the HSK words into data/fr/, from CFDICT, the free
// Chinese-French dictionary by Chine Informations (https://chine.in/mandarin/dictionnaire/CFDICT/,
// CC BY-SA 3.0), plus the fixes below for words it lacks or gets wrong.
// Run: node scripts/update-french.mjs [path/to/cfdict.u8]   (downloads it when no path is given)
// Then review `git diff data/fr/` and bump VERSION in sw.js so clients refresh their cache.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const CFDICT_URL = 'https://chine.in/assets/cfdict/cfdict.u8';
const DATA_DIR   = fileURLToPath(new URL('../data/', import.meta.url));
const LEVELS     = [1, 2, 3, 4, 5, 6];

// Meanings by word id: words missing from CFDICT, and entries whose first
// meanings aren't the HSK one (e.g. 刮 "gratter" before "souffler")
export const FRENCH_FIXES = {
  // Missing from CFDICT
  104:  ['an (âge)', 'année'],                                          // 岁
  715:  ['partir en vacances d’été'],                                   // 放暑假
  1323: ['bassin', 'mare', 'étang'],                                    // 池子
  1713: ['commentateur', 'présentateur'],                               // 解说员
  2072: ['faire un effort', 'forcer', 'y mettre toute sa force'],       // 使劲儿
  2538: ['rayure', 'zébrure', 'tache'],                                 // 斑纹
  2767: ['membre de l’équipage', 'agent de bord', 'contrôleur'],        // 乘务员
  2802: ['fête du Double Neuf', '9e jour du 9e mois lunaire'],          // 重阳节
  2813: ['se ridiculiser', 'se donner en spectacle'],                   // 出洋相
  3173: ['beaux-parents (parents du mari)'],                            // 公婆
  3385: ['poursuivre l’œuvre du passé et ouvrir l’avenir'],             // 继往开来
  3486: ['avenir brillant', 'belles perspectives'],                     // 锦绣前程
  3538: ['célèbre dans le monde entier', 'mondialement connu'],        // 举世闻名
  3710: ['vis'],                                                        // 螺丝钉
  3740: ['ne plus savoir quoi faire', 'être à court de solutions'],     // 没辙
  3793: ['encre'],                                                      // 墨水儿
  3822: ['bouton (de vêtement)'],                                       // 纽扣儿
  4247: ['étal', 'stand', 'éventaire'],                                 // 摊儿
  4255: ['brochette de fruits caramélisés', 'tanghulu'],                // 糖葫芦
  4299: ['monnaie', 'devise'],                                          // 通货
  4403: ['sans commentaire', 'je n’ai rien à dire'],                    // 无可奉告
  4935: ['briques et tuiles'],                                          // 砖瓦
  4963: ['se développer', 'croître', 'grandir (surtout au figuré)'],    // 滋长
  4994: ['inviter', 'régaler', 'jouer les hôtes'],                      // 做东
  // Another tone in the HSK list (dá for dǎ, shān for shàn…) or a typo in CFDICT
  166:  ['jouer au basket'],                                            // 打篮球
  1807: ['force', 'puissance'],                                         // 力量
  2027: ['éventail'],                                                   // 扇子
  4526: ['fou de joie', 'enthousiaste', 'jubilant'],                    // 兴高采烈

  // The HSK meaning first, without the long notes
  7:   ['de rien', 'je vous en prie', 'impoli'],                        // 不客气
  8:   ['ne… pas', 'non'],                                              // 不
  15:  ['(particule de possession ou de relation)', 'de'],             // 的
  16:  ['un peu', 'point', 'heure (de l’horloge)'],                    // 点
  29:  ['avion'],                                                       // 飞机
  32:  ['(classificateur général des personnes et des choses)', 'individuel'], // 个
  41:  ['revenir', 'rentrer', 'fois'],                                  // 回
  42:  ['savoir (faire)', 'pouvoir', 'réunion'],                       // 会
  49:  ['ouvrir', 'allumer', 'conduire'],                               // 开
  52:  ['morceau', 'yuan (familier)', 'bloc'],                          // 块
  55:  ['(marque une action accomplie)', '(marque un changement de situation)'], // 了
  61:  ['(particule interrogative en fin de phrase)'],                  // 吗
  71:  ['(particule finale : « et… ? », « où est… ? »)', '(marque une action en cours)'], // 呢
  72:  ['pouvoir', 'être capable de', 'capacité'],                     // 能
  90:  ['sur', 'dessus', 'monter'],                                     // 上
  111: ['allô', 'hé !', 'nourrir'],                                     // 喂
  123: ['mademoiselle', 'demoiselle'],                                  // 小姐
  138: ['à', 'dans', 'être en train de'],                               // 在
  145: ['habiter', 'loger', 'rester'],                                  // 住
  151: ['(particule de suggestion ou de demande)', '… d’accord ?', '… pas vrai ?'], // 吧
  161: ['porter (un vêtement)', 'mettre', 'traverser'],                // 穿
  170: ['(particule du complément de manière ou de degré)'],           // 得 de
  182: ['autobus', 'bus'],                                              // 公共汽车
  197: ['(classificateur des vêtements, affaires, événements)', 'pièce', 'article'], // 件
  213: ['fatigué', 'las'],                                              // 累
  215: ['deux', 'les deux', 'liang (unité de poids)'],                  // 两
  237: ['laisser', 'permettre', 'céder'],                               // 让
  261: ['laver', 'nettoyer'],                                           // 洗
  262: ['vers', 'en direction de', 'direction'],                        // 向
  272: ['médicament', 'remède'],                                        // 药
  273: ['vouloir', 'avoir besoin de', 'devoir'],                        // 要
  278: ['couvert (temps)', 'nuageux', 'ombre'],                         // 阴
  283: ['yuan (monnaie)', 'premier', 'principal'],                      // 元
  288: ['(classificateur des objets plats : feuille, table…)', 'ouvrir', 'étendre'], // 张
  289: ['grandir', 'chef', 'aîné'],                                     // 长 zhǎng
  385: ['souffler (vent)', 'gratter', 'racler'],                        // 刮
  400: ['dessin', 'peinture', 'dessiner'],                              // 画
  1771: ['objectif', 'impartial'],                                      // 客观

  // HSK 3–6: the HSK meaning first, instead of a rare sense, a typo or an off-topic one
  302:  ['ah !', '(particule finale d’affirmation ou d’exclamation)'],   // 啊
  327:  ['seulement alors', 'pas avant', 'tout juste'],                  // 才
  358:  ['hiver'],                                                       // 冬
  386:  ['fermer', 'éteindre', 'passe (de montagne)'],                   // 关
  398:  ['fleur', 'dépenser', 'motif'],                                  // 花
  409:  ['extrêmement', 'extrémité', 'pôle'],                            // 极
  420:  ['recevoir', 'répondre (au téléphone)', 'aller chercher qqn'],   // 接
  438:  ['quart d’heure', 'moment', 'graver'],                           // 刻
  466:  ['grand-mère (paternelle)', 'mamie'],                            // 奶奶
  485:  ['clair', 'net', 'comprendre'],                                  // 清楚
  498:  ['faire (faire qch)', 'rendre', 'utiliser'],                     // 使
  517:  ['(classificateur des objets longs et fins)', 'bande', 'article'], // 条
  536:  ['été'],                                                         // 夏
  548:  ['valise'],                                                      // 行李箱
  553:  ['lunettes'],                                                    // 眼镜
  579:  ['se tenir debout', 'station', 'arrêt'],                         // 站
  589:  ['important', 'essentiel', 'majeur'],                            // 重要
  597:  ['récemment', 'ces derniers temps', 'le plus proche'],           // 最近
  611:  ['reportage', 'rapporter (une nouvelle)', 'couvrir (un événement)'], // 报道
  616:  ['cahier', 'carnet', 'ordinateur portable'],                     // 笔记本
  632:  ['essuyer', 'frotter', 'effacer'],                               // 擦
  647:  ['honnête', 'sincère', 'honnêteté'],                             // 诚实
  672:  ['servir de', 'faire office de', 'lorsque'],                     // 当
  681:  ['attendre', 'etc.', 'classe'],                                  // 等
  682:  ['attendre', 'etc.', 'classe'],                                  // 等
  692:  ['casser', 'couper', 'interrompre'],                             // 断
  697:  ['(classificateur des repas, des reproches)', 'faire une pause', 'soudain'], // 顿
  698:  ['(classificateur des fleurs, des nuages)', 'bouton (de fleur)'], // 朵
  708:  ['refléter', 'reflet', 'rapporter (à un supérieur)'],            // 反映
  739:  ['kilomètre'],                                                   // 公里
  776:  ['singe'],                                                       // 猴子
  814:  ['remettre', 'livrer', 'payer'],                                 // 交
  825:  ['nerveux', 'tendu', 'intense'],                                 // 紧张
  855:  ['amer', 'pénible', 'souffrance'],                               // 苦
  857:  ['avoir sommeil', 'fatigué', 'être dans l’embarras'],            // 困
  929:  ['(après un verbe : début d’une action)', 'se lever', 'se mettre à'], // 起来
  964:  ['canapé', 'sofa'],                                              // 沙发
  974:  ['économiser', 'épargner', 'province'],                          // 省
  975:  ['rester', 'être de reste', 'restant'],                          // 剩
  981:  ['très', 'tout à fait', 'extrêmement'],                          // 十分
  999:  ['perdre (jeu, match)', 'transporter', 'transfuser'],            // 输
  1019: ['(classificateur des machines, des appareils)', 'estrade', 'plateforme'], // 台
  1027: ['détester', 'désagréable', 'ennuyeux'],                         // 讨厌
  1035: ['assez', 'très', 'se redresser'],                               // 挺
  1044: ['vers', 'en direction de', 'aller'],                            // 往
  1065: ['parfumé', 'odorant', 'délicieux'],                             // 香
  1121: ['par', 'de (à partir de)', 'à cause de'],                       // 由
  1131: ['langue', 'langage'],                                           // 语言
  1180: ['célèbre', 'connu', 'renommé'],                                 // 著名
  1255: ['ne pas avoir besoin de', 'ce n’est pas la peine'],             // 不必
  1264: ['inévitablement'],                                              // 不免
  1268: ['tissu', 'toile', 'annoncer'],                                  // 布
  1272: ['marcher sur', 'piétiner', 'écraser du pied'],                  // 踩
  1305: ['appeler', 'peser', 'nom'],                                     // 称
  1307: ['louer', 'faire l’éloge de', 'louange'],                        // 称赞
  1315: ['fonder', 'établir', 'être valable'],                           // 成立
  1341: ['enlever', 'excepté', 'diviser'],                               // 除
  1368: ['déposer', 'garder', 'exister'],                                // 存
  1376: ['éternuer', 'éternuement'],                                     // 打喷嚏
  1408: ['être égal à', 'équivaloir à'],                                 // 等于
  1415: ['région', 'zone', 'district'],                                  // 地区
  1429: ['taquiner', 'amuser', 'drôle'],                                 // 逗
  1462: ['à plusieurs reprises', 'répéter', 'versatile'],                // 反复
  1492: ['(classificateur des tableaux, des tissus)', 'largeur', 'bande'], // 幅
  1503: ['couvercle', 'couvrir', 'construire'],                          // 盖
  1527: ['racine', '(classificateur des objets longs et fins)', 'base'], // 根
  1540: ['kung-fu', 'habileté', 'temps (et efforts)'],                   // 功夫
  1570: ['Bienvenue !', 'honorer de sa présence'],                       // 光临
  1580: ['règle', 'règlement', 'régulier'],                              // 规则
  1594: ['secteur', 'branche', 'métier'],                                // 行业
  1607: ['horizontal', 'transversal', 'en travers'],                     // 横
  1628: ['or', 'doré', 'précieux'],                                      // 黄金
  1666: ['se marier (pour une femme)', 'marier (sa fille)', 'rejeter (la faute) sur'], // 嫁
  1671: ['ferme', 'résolu', 'décidé'],                                   // 坚决
  1677: ['ciseaux'],                                                     // 剪刀
  1714: ['(classificateur des sessions, des promotions)', 'session', 'promotion'], // 届
  1724: ['importer', 'importation', 'entrée'],                           // 进口
  1738: ['lever', 'soulever', 'citer (un exemple)'],                     // 举
  1757: ['content', 'joyeux', 'heureux'],                                // 开心
  1769: ['gramme', 'vaincre', 'maîtriser'],                              // 克
  1785: ['pourri', 'trop cuit', 'en lambeaux'],                          // 烂
  1842: ['mantou', 'petit pain à la vapeur'],                            // 馒头
  1865: ['seconde'],                                                     // 秒
  1879: ['flou', 'vague', 'confondre'],                                  // 模糊
  1904: ['taper', 'frapper (doucement)', 'prendre (une photo)'],         // 拍
  1916: ['(classificateur des lots, des groupes)', 'critiquer', 'approuver'], // 批
  1919: ['chaussures en cuir'],                                          // 皮鞋
  1920: ['(classificateur des chevaux, des rouleaux de tissu)', 'égaler'], // 匹
  1923: ['flotter (au vent)', 'voltiger', 'tourbillonner'],              // 飘
  1953: ['devoir (de l’argent)', 'manquer de', 'dette'],                 // 欠
  2025: ['bon', 'gentil', 'bienveillant'],                               // 善良
  2033: ['langue (organe)'],                                             // 舌头
  2034: ['ne pas avoir le cœur de', 'regretter de quitter', 'ne pas vouloir se séparer de'], // 舍不得
  2047: ['monter', 's’élever', 'litre'],                                 // 升
  2121: ['(classificateur des maisons, des écoles)', 'endroit', 'institut'], // 所
  2133: ['(classificateur des ensembles, des séries)', 'housse', 'enfiler'], // 套
  2216: ['innombrable', 'd’innombrables'],                               // 无数
  2243: ['penser à', 'regretter (l’absence de)', 'manquer (à qqn)'],     // 想念
  2244: ['imaginer', 'imagination', 'se figurer'],                       // 想象
  2257: ['en-cas', 'snack', 'collation'],                                // 小吃
  2258: ['jeune homme', 'gars'],                                         // 小伙子
  2308: ['taille', 'reins', 'bas du dos'],                               // 腰
  2334: ['facteur', 'élément'],                                          // 因素
  2384: ['alors', 'quant à', 'règle'],                                   // 则
  2406: ['(classificateur des moments brefs : rafale, accès)', 'moment', 'formation de combat'], // 阵
  2421: ['(classificateur des objets longs : stylos, cigarettes)', 'soutenir', 'branche'], // 支
  2437: ['horloge', 'pendule', 'heure (durée)'],                         // 钟
  2441: ['lourd', 'important', 'poids'],                                 // 重
  2460: ['charger', 'installer', 'faire semblant'],                      // 装
  2467: ['documentation', 'données', 'matériel'],                        // 资料
  2493: ['ivre', 'soûl', 'enivré'],                                      // 醉
  2565: ['remercier', 'récompenser', 'rendre la pareille'],              // 报答
  2576: ['tragique', 'misérable', 'lamentable'],                         // 悲惨
  2615: ['bord', 'bordure', 'marge'],                                    // 边缘
  2616: ['plat', 'aplati'],                                              // 扁
  2632: ['marque', 'signe', 'marquer'],                                  // 标记
  2633: ['titre', 'en-tête', 'manchette'],                               // 标题
  2679: ['par tous les moyens', 'sans scrupules'],                       // 不择手段
  2680: ['plus de', 'ne pas se limiter à', 'sans cesse'],                // 不止
  2812: ['avenir prometteur', 'perspectives', 'réussir'],                // 出息
  2828: ['haleter', 'souffler', 'reprendre son souffle'],                // 喘气
  2844: ['épine', 'piquer', 'irriter'],                                  // 刺
  2895: ['actuel', 'à présent', 'devant soi'],                           // 当前
  2902: ['niveau', 'gamme', 'catégorie'],                                // 档次
  2914: ['offenser', 'froisser', 'vexer'],                               // 得罪
  2917: ['débarquer', 'toucher terre', 'atterrir'],                      // 登陆
  2942: ['suspendre', 'pendre', 'hisser'],                               // 吊
  2962: ['partir', 'se mettre en route'],                                // 动身
  2976: ['tenir à plat (des deux mains)', 'extrémité', 'bout'],          // 端
  2979: ['bref', 'court', 'brièveté'],                                   // 短促
  2982: ['couper', 'rompre'],                                            // 断绝
  3012: ['s’apercevoir', 'découvrir', 'constater'],                      // 发觉
  3017: ['développer', 'promouvoir', 'faire rayonner'],                  // 发扬
  3093: ['consacrer', 'dédier', 'dévouement'],                           // 奉献
  3096: ['madame', 'dame', 'épouse'],                                    // 夫人
  3146: ['monter en flèche', 'être en plein essor', 'essor'],            // 高涨
  3160: ['profondément enraciné', 'invétéré'],                           // 根深蒂固
  3164: ['suivre à la trace', 'filer', 'suivre'],                        // 跟踪
  3172: ['citoyen', 'citoyenneté'],                                      // 公民
  3179: ['authentification notariale', 'notarié', 'certifier'],          // 公证
  3196: ['crochet', 'hameçon', 'croc'],                                  // 钩子
  3243: ['transition', 'transitoire', 'passer de… à…'],                  // 过渡
  3246: ['faute', 'erreur', 'par négligence'],                           // 过失
  3253: ['vague', 'ambigu', 'négligent'],                                // 含糊
  3273: ['harmonie', 'harmonieux'],                                      // 和谐
  3279: ['rentable', 'avantageux', 'valoir la peine'],                   // 合算
  3285: ['vacarme', 'éclat de rire', 'tumulte'],                         // 哄
  3297: ['candidat', 'candidature'],                                     // 候选
  3353: ['motorisé', 'mobile', 'flexible'],                              // 机动
  3398: ['type', 'individu', 'outil'],                                   // 家伙
  3407: ['ferme', 'résolu', 'raffermir'],                                // 坚定
  3427: ['distinguer', 'discerner', 'identifier'],                       // 鉴别
  3428: ['évaluer', 'expertiser', 'évaluation'],                         // 鉴定
  3439: ['navire de guerre', 'bâtiment de guerre'],                      // 舰艇
  3441: ['général', 'faire échec à'],                                    // 将军
  3452: ['point focal', 'centre (de l’attention)', 'foyer (optique)'],   // 焦点
  3473: ['licencier', 'renvoyer', 'licenciement'],                       // 解雇
  3487: ['puis', 'ensuite', 'et en plus'],                               // 进而
  3490: ['progresser', 'progrès', 'avancer'],                            // 进展
  3518: ['niveau (atteint)', 'état', 'limite'],                          // 境界
  3521: ['objectif (de caméra)', 'plan (cinéma)', 'scène'],              // 镜头
  3568: ['généreux', 'fervent', 'véhément'],                             // 慷慨
  3589: ['trou', 'fosse', 'escroquer'],                                  // 坑
  3659: ['s’efforcer de', 'chercher à'],                                 // 力图
  3664: ['avec', 'ainsi que', 'y compris'],                              // 连同
  3726: ['faire un pas', 'enjamber', 'âgé'],                             // 迈
  3748: ['germe', 'bourgeon', 'germer'],                                 // 萌芽
  3751: ['plisser les yeux', 'cligner'],                                 // 眯
  3754: ['déconcerter', 'troubler', 'perplexe'],                         // 迷惑
  3759: ['sceller', 'fermer hermétiquement', 'étanche'],                 // 密封
  3781: ['tâtonner', 'chercher à tâtons', 'explorer'],                   // 摸索
  3786: ['mode', 'modèle', 'schéma'],                                    // 模式
  3819: ['fixer du regard', 'contempler'],                               // 凝视
  3866: ['justement (contre toute attente)', 'malheureusement', 's’obstiner à'], // 偏偏
  3890: ['verser', 'renverser (un liquide)', 'éclabousser'],             // 泼
  3915: ['chahuter', 'huer', 'semer le désordre'],                       // 起哄
  3945: ['s’accommoder de', 'céder', 'se plier à'],                      // 迁就
  3966: ['travailleur et économe'],                                      // 勤俭
  3983: ['intrigue', 'scénario', 'circonstances'],                       // 情节
  3995: ['expulser', 'chasser', 'bannir'],                               // 驱逐
  4002: ['tout mettre en œuvre', 'faire tout son possible'],             // 全力以赴
  4011: ['boiteux', 'boiter'],                                           // 瘸
  4039: ['capricieux', 'têtu', 'caprice'],                               // 任性
  4089: ['profond', 'abstrus', 'ésotérique'],                            // 深奥
  4188: ['joyeux', 'détendu', 'sans souci'],                             // 舒畅
  4192: ['(classificateur des bouquets, des faisceaux)', 'lier', 'restreindre'], // 束
  4201: ['rincer', 'faire cuire dans une fondue chinoise', 'duper'],     // 涮
  4219: ['hausser (les épaules)', 'se dresser', 'élevé'],                // 耸
  4220: ['(classificateur des bateaux, des navires)'],                   // 艘
  4221: ['rechercher', 'fouiller', 'recherche'],                         // 搜索
  4239: ['s’effondrer', 's’affaisser', 's’écrouler'],                    // 塌
  4286: ['harmonieux', 'réconcilier', 'concilier'],                      // 调和
  4295: ['pause', 's’arrêter', 'interruption'],                          // 停顿
  4302: ['mine de cuivre', 'minerai de cuivre'],                         // 铜矿
  4304: ['camarade', 'gay (familier)'],                                  // 同志
  4309: ['spéculer', 'opportuniste', 's’entendre bien'],                 // 投机
  4323: ['supposer', 'conjecturer', 'présumer'],                         // 推测
  4326: ['déduire', 'inférence', 'corollaire'],                          // 推论
  4340: ['ouah !', '(particule exclamative, variante de 啊)'],            // 哇
  4345: ['extraverti', 'tourné vers l’extérieur'],                       // 外向
  4360: ['vain espoir', 'chimère', 'délire'],                            // 妄想
  4380: ['un peu trop', 'vraiment', 'plutôt'],                           // 未免
  4392: ['nid', 'repaire', 'tanière'],                                   // 窝
  4405: ['voyou', 'vaurien', 'sans vergogne'],                           // 无赖
  4419: ['erreur', 'écart', 'marge d’erreur'],                           // 误差
  4443: ['colonie de vacances', 'camp d’été'],                           // 夏令营
  4448: ['soulever', 'déclencher', 'lancer (un mouvement)'],             // 掀起
  4453: ['ragots', 'bavardage', 'cancans'],                              // 闲话
  4463: ['farce', 'garniture'],                                          // 馅儿
  4466: ['égal', 'équivalent', 'égalité'],                               // 相等
  4475: ['guide'],                                                       // 向导
  4488: ['association', 'société'],                                      // 协会
  4502: ['âme', 'esprit', 'cœur'],                                       // 心灵
  4506: ['intentions', 'pensées', 'cœur'],                               // 心眼儿
  4528: ['cœur', 'largeur d’esprit', 'poitrine'],                        // 胸怀
  4530: ['féroce', 'cruel', 'méchant'],                                  // 凶恶
  4600: ['clin d’œil', 'signe des yeux', 'tact'],                        // 眼色
  4606: ['oxygène'],                                                     // 氧气
  4617: ['extrêmement', 'à mourir', 'tuer'],                             // 要命
  4646: ['jusqu’à', 'si bien que', 'de sorte que'],                      // 以至
  4647: ['si bien que', 'de sorte que', 'au point de'],                  // 以致
  4677: ['sage', 'clairvoyant', 'éclairé'],                              // 英明
  4697: ['mélancolique', 'déprimé', 'mélancolie'],                       // 忧郁
  4708: ['augmenter de jour en jour', 'croître sans cesse'],             // 与日俱增
  4709: ['doudoune', 'manteau en duvet'],                                // 羽绒服
  4744: ['comment', 'pourquoi', 'quoi (dialectal)'],                     // 咋
  4747: ['abattre (un animal)', 'tuer', 'escroquer (un client)'],        // 宰
  4757: ['gaspiller', 'gâcher', 'abîmer'],                               // 糟蹋
  4765: ['voleur', 'rusé', 'traître'],                                   // 贼
  4780: ['montrer', 'se manifester', 'déployer'],                        // 展现
  4790: ['aîné', 'les anciens', 'génération précédente'],                // 长辈
  4809: ['rare et précieux'],                                            // 珍稀
  4812: ['peser (ses mots)', 'réfléchir', 'délibérer'],                  // 斟酌
  4832: ['légitime', 'juste', 'juste au moment où'],                     // 正当
  4862: ['ordre', 'instruction', 'commande'],                            // 指令
  4875: ['se consacrer à', 's’engager à'],                               // 致力于
  4896: ['centre de gravité', 'point central', 'essentiel'],             // 重心
  4964: ['balle (d’arme)', 'cartouche'],                                 // 子弹
  4981: ['louer', 'prendre en location', 'bail'],                        // 租赁
};

/** CFDICT text → Map of simplified hanzi to its entries [{ pinyin, meanings }]. */
export function parseCfdict(text) {
  const entries = new Map();
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\S+ (\S+) \[([^\]]*)\] \/(.*)\/$/);
    if (!match || line.startsWith('#')) continue;
    const [, hanzi, pinyin, meanings] = match;
    if (!entries.has(hanzi)) entries.set(hanzi, []);
    entries.get(hanzi).push({ pinyin: normalizePinyin(pinyin), meanings: meanings.split('/') });
  }
  return entries;
}

/**
 * Meanings of an HSK word: the entries with the same pinyin, or else the same one
 * but for neutral tones, which the two sources often write differently (guān xì / guan1 xi5).
 */
export function findMeanings(entries, word) {
  const candidates = entries.get(word.hanzi) ?? [];
  const pinyin = numberedPinyin(word.pinyin);
  const exact  = candidates.filter(entry => entry.pinyin === pinyin);
  const loose  = candidates.filter(entry => isSameButNeutralTones(entry.pinyin, pinyin));
  const meanings = (exact.length ? exact : loose).flatMap(entry => entry.meanings);
  return [...new Set(meanings.filter(isUseful))];
}

// Slang and dialect senses, and radical numbers ('(72e radical)'), don't belong on a card
function isUseful(meaning) {
  return meaning !== '' && !/\((argot|dial\.)\)|^\(?(\d+e radical|radical \d+)\)?$/.test(meaning);
}

// 'nǚ ér' → 'nu:3 er2', the CFDICT way; no mark is the neutral tone (5)
export function numberedPinyin(pinyin) {
  return pinyin.toLowerCase().split(/\s+/).map(syllable => {
    const letters = syllable.normalize('NFD');
    const tone = Object.entries(TONE_MARKS).find(([mark]) => letters.includes(mark))?.[1] ?? '5';
    const plain = [...letters].filter(c => !(c in TONE_MARKS)).join('').normalize('NFC');
    return normalizePinyin(plain + tone);
  }).join(' ');
}

const TONE_MARKS = { '̄': '1', '́': '2', '̌': '3', '̀': '4' };

// ü is written ü, v or u: depending on the source
function normalizePinyin(pinyin) {
  return pinyin.toLowerCase().replace(/ü|v/g, 'u:');
}

function isSameButNeutralTones(a, b) {
  const syllablesA = a.split(' ');
  const syllablesB = b.split(' ');
  return syllablesA.length === syllablesB.length && syllablesA.every((syllable, i) => {
    const [, letters, tone] = syllable.match(/^(\D+)(\d?)$/) ?? [];
    const [, otherLetters, otherTone] = syllablesB[i].match(/^(\D+)(\d?)$/) ?? [];
    const isNeutral = [tone, otherTone].some(t => t === '' || t === '5');
    return letters !== undefined && letters === otherLetters && (tone === otherTone || isNeutral);
  });
}

async function main() {
  const source = process.argv[2]
    ? await readFile(process.argv[2], 'utf8')
    : await fetch(CFDICT_URL).then(res => {
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${CFDICT_URL}`);
      return res.text();
    });
  const entries = parseCfdict(source);
  await mkdir(`${DATA_DIR}fr`, { recursive: true });

  const missing = [];
  for (const level of LEVELS) {
    const words = JSON.parse(await readFile(`${DATA_DIR}hsk-level-${level}.json`, 'utf8'));
    const meanings = Object.fromEntries(words.flatMap(word => {
      const found = FRENCH_FIXES[word.id] ?? findMeanings(entries, word);
      if (!found.length) missing.push(`${word.id} ${word.hanzi} ${word.pinyin}`);
      return found.length ? [[word.id, found]] : [];
    }));
    await writeFile(`${DATA_DIR}fr/hsk-level-${level}.json`, JSON.stringify(meanings, null, 1) + '\n');
    console.log(`✓ fr/hsk-level-${level}.json (${Object.keys(meanings).length}/${words.length} words)`);
  }
  if (missing.length) console.log(`No French meaning, English is shown instead:\n  ${missing.join('\n  ')}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
