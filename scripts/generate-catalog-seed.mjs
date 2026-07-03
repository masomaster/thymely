#!/usr/bin/env node
/**
 * Generates supabase/migrations/0002_seed_plant_catalog.sql from a curated list
 * of common garden plants.
 *
 * Data is hand-curated common-name/scientific-name pairs for widely grown
 * garden plants (vegetables, herbs, fruits, flowers, houseplants, shrubs, trees,
 * succulents). Common names and binomials are facts / public-domain and are
 * corroborated by open datasets such as Wikidata (CC0) and USDA PLANTS
 * (public domain). Obscure species not in this set are handled at runtime by the
 * optional GBIF suggest fallback (https://api.gbif.org/v1/species/suggest).
 *
 * Run: node scripts/generate-catalog-seed.mjs
 */
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

/** [common_name, scientific_name] grouped by category. */
const DATA = {
  Vegetable: [
    ['Tomato', 'Solanum lycopersicum'],
    ['Cherry Tomato', 'Solanum lycopersicum var. cerasiforme'],
    ['Potato', 'Solanum tuberosum'],
    ['Eggplant', 'Solanum melongena'],
    ['Bell Pepper', 'Capsicum annuum'],
    ['Chili Pepper', 'Capsicum annuum'],
    ['Jalapeño', 'Capsicum annuum'],
    ['Habanero', 'Capsicum chinense'],
    ['Cucumber', 'Cucumis sativus'],
    ['Zucchini', 'Cucurbita pepo'],
    ['Summer Squash', 'Cucurbita pepo'],
    ['Butternut Squash', 'Cucurbita moschata'],
    ['Acorn Squash', 'Cucurbita pepo'],
    ['Pumpkin', 'Cucurbita pepo'],
    ['Watermelon', 'Citrullus lanatus'],
    ['Cantaloupe', 'Cucumis melo'],
    ['Honeydew Melon', 'Cucumis melo'],
    ['Carrot', 'Daucus carota'],
    ['Beet', 'Beta vulgaris'],
    ['Radish', 'Raphanus sativus'],
    ['Turnip', 'Brassica rapa'],
    ['Parsnip', 'Pastinaca sativa'],
    ['Onion', 'Allium cepa'],
    ['Shallot', 'Allium cepa var. aggregatum'],
    ['Garlic', 'Allium sativum'],
    ['Leek', 'Allium ampeloprasum'],
    ['Green Onion', 'Allium fistulosum'],
    ['Chives', 'Allium schoenoprasum'],
    ['Lettuce', 'Lactuca sativa'],
    ['Romaine Lettuce', 'Lactuca sativa var. longifolia'],
    ['Spinach', 'Spinacia oleracea'],
    ['Kale', 'Brassica oleracea var. sabellica'],
    ['Swiss Chard', 'Beta vulgaris subsp. vulgaris'],
    ['Cabbage', 'Brassica oleracea var. capitata'],
    ['Broccoli', 'Brassica oleracea var. italica'],
    ['Cauliflower', 'Brassica oleracea var. botrytis'],
    ['Brussels Sprouts', 'Brassica oleracea var. gemmifera'],
    ['Collard Greens', 'Brassica oleracea var. viridis'],
    ['Bok Choy', 'Brassica rapa subsp. chinensis'],
    ['Arugula', 'Eruca vesicaria'],
    ['Celery', 'Apium graveolens'],
    ['Asparagus', 'Asparagus officinalis'],
    ['Green Bean', 'Phaseolus vulgaris'],
    ['Pole Bean', 'Phaseolus vulgaris'],
    ['Fava Bean', 'Vicia faba'],
    ['Pea', 'Pisum sativum'],
    ['Snap Pea', 'Pisum sativum var. macrocarpon'],
    ['Sweet Corn', 'Zea mays'],
    ['Okra', 'Abelmoschus esculentus'],
    ['Sweet Potato', 'Ipomoea batatas'],
    ['Ginger', 'Zingiber officinale'],
    ['Turmeric', 'Curcuma longa'],
    ['Artichoke', 'Cynara cardunculus var. scolymus'],
    ['Rhubarb', 'Rheum rhabarbarum'],
    ['Kohlrabi', 'Brassica oleracea var. gongylodes'],
    ['Fennel', 'Foeniculum vulgare'],
    ['Horseradish', 'Armoracia rusticana'],
  ],
  Herb: [
    ['Basil', 'Ocimum basilicum'],
    ['Thai Basil', 'Ocimum basilicum var. thyrsiflora'],
    ['Thyme', 'Thymus vulgaris'],
    ['Rosemary', 'Salvia rosmarinus'],
    ['Sage', 'Salvia officinalis'],
    ['Oregano', 'Origanum vulgare'],
    ['Marjoram', 'Origanum majorana'],
    ['Mint', 'Mentha'],
    ['Peppermint', 'Mentha × piperita'],
    ['Spearmint', 'Mentha spicata'],
    ['Parsley', 'Petroselinum crispum'],
    ['Cilantro', 'Coriandrum sativum'],
    ['Dill', 'Anethum graveolens'],
    ['Tarragon', 'Artemisia dracunculus'],
    ['Lavender', 'Lavandula angustifolia'],
    ['Lemongrass', 'Cymbopogon citratus'],
    ['Lemon Balm', 'Melissa officinalis'],
    ['Bay Laurel', 'Laurus nobilis'],
    ['Chamomile', 'Matricaria chamomilla'],
    ['Stevia', 'Stevia rebaudiana'],
    ['Catnip', 'Nepeta cataria'],
    ['Borage', 'Borago officinalis'],
    ['Chervil', 'Anthriscus cerefolium'],
    ['Savory', 'Satureja hortensis'],
    ['Sorrel', 'Rumex acetosa'],
  ],
  Fruit: [
    ['Strawberry', 'Fragaria × ananassa'],
    ['Blueberry', 'Vaccinium corymbosum'],
    ['Raspberry', 'Rubus idaeus'],
    ['Blackberry', 'Rubus fruticosus'],
    ['Grape', 'Vitis vinifera'],
    ['Apple', 'Malus domestica'],
    ['Pear', 'Pyrus communis'],
    ['Peach', 'Prunus persica'],
    ['Plum', 'Prunus domestica'],
    ['Cherry', 'Prunus avium'],
    ['Apricot', 'Prunus armeniaca'],
    ['Fig', 'Ficus carica'],
    ['Lemon', 'Citrus limon'],
    ['Lime', 'Citrus aurantiifolia'],
    ['Orange', 'Citrus × sinensis'],
    ['Mandarin', 'Citrus reticulata'],
    ['Grapefruit', 'Citrus × paradisi'],
    ['Kiwi', 'Actinidia deliciosa'],
    ['Pomegranate', 'Punica granatum'],
    ['Avocado', 'Persea americana'],
    ['Banana', 'Musa acuminata'],
    ['Pineapple', 'Ananas comosus'],
    ['Mango', 'Mangifera indica'],
    ['Papaya', 'Carica papaya'],
    ['Currant', 'Ribes rubrum'],
    ['Gooseberry', 'Ribes uva-crispa'],
    ['Cranberry', 'Vaccinium macrocarpon'],
    ['Elderberry', 'Sambucus nigra'],
    ['Passion Fruit', 'Passiflora edulis'],
    ['Olive', 'Olea europaea'],
  ],
  Flower: [
    ['Rose', 'Rosa'],
    ['Tulip', 'Tulipa'],
    ['Daffodil', 'Narcissus'],
    ['Sunflower', 'Helianthus annuus'],
    ['Marigold', 'Tagetes'],
    ['Zinnia', 'Zinnia elegans'],
    ['Petunia', 'Petunia × atkinsiana'],
    ['Pansy', 'Viola × wittrockiana'],
    ['Geranium', 'Pelargonium'],
    ['Begonia', 'Begonia'],
    ['Dahlia', 'Dahlia pinnata'],
    ['Chrysanthemum', 'Chrysanthemum'],
    ['Peony', 'Paeonia'],
    ['Lily', 'Lilium'],
    ['Daylily', 'Hemerocallis'],
    ['Iris', 'Iris'],
    ['Hydrangea', 'Hydrangea macrophylla'],
    ['Hibiscus', 'Hibiscus rosa-sinensis'],
    ['Snapdragon', 'Antirrhinum majus'],
    ['Cosmos', 'Cosmos bipinnatus'],
    ['Poppy', 'Papaver'],
    ['Lavender', 'Lavandula'],
    ['Sweet Pea', 'Lathyrus odoratus'],
    ['Nasturtium', 'Tropaeolum majus'],
    ['Impatiens', 'Impatiens walleriana'],
    ['Coneflower', 'Echinacea purpurea'],
    ['Black-eyed Susan', 'Rudbeckia hirta'],
    ['Aster', 'Symphyotrichum'],
    ['Foxglove', 'Digitalis purpurea'],
    ['Delphinium', 'Delphinium'],
    ['Lupine', 'Lupinus'],
    ['Salvia', 'Salvia splendens'],
    ['Verbena', 'Verbena'],
    ['Coleus', 'Coleus scutellarioides'],
    ['Gerbera Daisy', 'Gerbera jamesonii'],
    ['Carnation', 'Dianthus caryophyllus'],
    ['Gladiolus', 'Gladiolus'],
    ['Hollyhock', 'Alcea rosea'],
    ['Morning Glory', 'Ipomoea purpurea'],
    ['Bleeding Heart', 'Lamprocapnos spectabilis'],
    ['Lantana', 'Lantana camara'],
    ['Calendula', 'Calendula officinalis'],
    ['Sweet Alyssum', 'Lobularia maritima'],
    ['Bee Balm', 'Monarda didyma'],
    ['Yarrow', 'Achillea millefolium'],
    ['Hosta', 'Hosta'],
  ],
  Houseplant: [
    ['Pothos', 'Epipremnum aureum'],
    ['Snake Plant', 'Dracaena trifasciata'],
    ['Monstera', 'Monstera deliciosa'],
    ['Peace Lily', 'Spathiphyllum'],
    ['Spider Plant', 'Chlorophytum comosum'],
    ['ZZ Plant', 'Zamioculcas zamiifolia'],
    ['Rubber Plant', 'Ficus elastica'],
    ['Fiddle-leaf Fig', 'Ficus lyrata'],
    ['Philodendron', 'Philodendron hederaceum'],
    ['Chinese Evergreen', 'Aglaonema'],
    ['Dracaena', 'Dracaena fragrans'],
    ['Dieffenbachia', 'Dieffenbachia'],
    ['Calathea', 'Goeppertia'],
    ['Prayer Plant', 'Maranta leuconeura'],
    ['Boston Fern', 'Nephrolepis exaltata'],
    ['English Ivy', 'Hedera helix'],
    ['Anthurium', 'Anthurium andraeanum'],
    ['Orchid', 'Phalaenopsis'],
    ['African Violet', 'Streptocarpus sect. Saintpaulia'],
    ['Croton', 'Codiaeum variegatum'],
    ['Areca Palm', 'Dypsis lutescens'],
    ['Parlor Palm', 'Chamaedorea elegans'],
    ['Bird of Paradise', 'Strelitzia reginae'],
    ['Norfolk Island Pine', 'Araucaria heterophylla'],
    ['Nerve Plant', 'Fittonia albivenis'],
    ['Polka Dot Plant', 'Hypoestes phyllostachya'],
    ['Wandering Jew', 'Tradescantia zebrina'],
    ['Air Plant', 'Tillandsia'],
  ],
  Succulent: [
    ['Aloe Vera', 'Aloe vera'],
    ['Jade Plant', 'Crassula ovata'],
    ['Echeveria', 'Echeveria'],
    ['Haworthia', 'Haworthiopsis'],
    ['Christmas Cactus', 'Schlumbergera'],
    ['Barrel Cactus', 'Ferocactus'],
    ['Prickly Pear', 'Opuntia'],
    ['Agave', 'Agave americana'],
    ['Sedum', 'Sedum'],
    ['String of Pearls', 'Curio rowleyanus'],
    ['Burros Tail', 'Sedum morganianum'],
    ['Panda Plant', 'Kalanchoe tomentosa'],
    ['Hens and Chicks', 'Sempervivum tectorum'],
    ['Ponytail Palm', 'Beaucarnea recurvata'],
    ['Zebra Plant', 'Haworthiopsis fasciata'],
  ],
  Shrub: [
    ['Boxwood', 'Buxus sempervirens'],
    ['Azalea', 'Rhododendron'],
    ['Rhododendron', 'Rhododendron'],
    ['Camellia', 'Camellia japonica'],
    ['Forsythia', 'Forsythia'],
    ['Lilac', 'Syringa vulgaris'],
    ['Butterfly Bush', 'Buddleja davidii'],
    ['Spirea', 'Spiraea'],
    ['Viburnum', 'Viburnum'],
    ['Holly', 'Ilex'],
    ['Juniper', 'Juniperus'],
    ['Barberry', 'Berberis'],
    ['Weigela', 'Weigela florida'],
    ['Rose of Sharon', 'Hibiscus syriacus'],
    ['Gardenia', 'Gardenia jasminoides'],
    ['Oleander', 'Nerium oleander'],
    ['Mountain Laurel', 'Kalmia latifolia'],
    ['Privet', 'Ligustrum'],
    ['Dogwood Shrub', 'Cornus sericea'],
    ['Hebe', 'Veronica'],
  ],
  Tree: [
    ['Maple', 'Acer'],
    ['Japanese Maple', 'Acer palmatum'],
    ['Oak', 'Quercus'],
    ['Birch', 'Betula'],
    ['Pine', 'Pinus'],
    ['Spruce', 'Picea'],
    ['Fir', 'Abies'],
    ['Willow', 'Salix'],
    ['Dogwood', 'Cornus florida'],
    ['Magnolia', 'Magnolia'],
    ['Redbud', 'Cercis canadensis'],
    ['Crape Myrtle', 'Lagerstroemia'],
    ['Cherry Blossom', 'Prunus serrulata'],
    ['Elm', 'Ulmus'],
    ['Ash', 'Fraxinus'],
    ['Sycamore', 'Platanus'],
    ['Poplar', 'Populus'],
    ['Cedar', 'Cedrus'],
    ['Cypress', 'Cupressus'],
    ['Ginkgo', 'Ginkgo biloba'],
  ],
  Grass: [
    ['Bermuda Grass', 'Cynodon dactylon'],
    ['Kentucky Bluegrass', 'Poa pratensis'],
    ['Tall Fescue', 'Festuca arundinacea'],
    ['Ryegrass', 'Lolium perenne'],
    ['Zoysia Grass', 'Zoysia'],
    ['St. Augustine Grass', 'Stenotaphrum secundatum'],
    ['Fountain Grass', 'Pennisetum'],
    ['Pampas Grass', 'Cortaderia selloana'],
    ['Blue Fescue', 'Festuca glauca'],
    ['Feather Reed Grass', 'Calamagrostis × acutiflora'],
    ['Bamboo', 'Bambusoideae'],
    ['Mondo Grass', 'Ophiopogon japonicus'],
  ],
};

function esc(s) {
  return s.replace(/'/g, "''");
}

const rows = [];
for (const [category, list] of Object.entries(DATA)) {
  for (const [common, scientific] of list) {
    rows.push({ common, scientific, category });
  }
}

const values = rows
  .map((r) => `  ('${esc(r.common)}', '${esc(r.scientific)}', '${esc(r.category)}')`)
  .join(',\n');

const sql = `-- Thymely — Phase 0 plant catalog seed (generated by scripts/generate-catalog-seed.mjs)
-- ${rows.length} curated common garden plants. Regenerate with:
--   node scripts/generate-catalog-seed.mjs
-- Obscure species not listed here are covered at runtime by the optional GBIF
-- suggest fallback (https://api.gbif.org/v1/species/suggest).

-- Deduplicate on (common_name, scientific_name) so re-running is safe.
create unique index if not exists uq_catalog_name
  on public.plant_catalog (common_name, scientific_name);

-- Trigram indexes power fast fuzzy "as-you-type" search.
create index if not exists idx_catalog_common_trgm
  on public.plant_catalog using gin (common_name gin_trgm_ops);
create index if not exists idx_catalog_sci_trgm
  on public.plant_catalog using gin (scientific_name gin_trgm_ops);

insert into public.plant_catalog (common_name, scientific_name, category) values
${values}
on conflict (common_name, scientific_name) do nothing;

-- Fuzzy search RPC used by the type-ahead combobox. Ranks trigram similarity,
-- but also matches substrings so short queries ("tom") work well.
create or replace function public.search_plant_catalog(query text, max_results int default 20)
returns setof public.plant_catalog
language sql
stable
as $$
  select *
  from public.plant_catalog
  where common_name ilike '%' || query || '%'
     or scientific_name ilike '%' || query || '%'
     or common_name % query
  order by similarity(common_name, query) desc nulls last, common_name asc
  limit greatest(1, least(max_results, 50));
$$;

grant execute on function public.search_plant_catalog(text, int) to anon, authenticated;
`;

const outPath = join(__dirname, '..', 'supabase', 'migrations', '0002_seed_plant_catalog.sql');
writeFileSync(outPath, sql);
console.log(`Wrote ${rows.length} catalog rows to ${outPath}`);
