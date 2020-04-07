/*DROP TABLE IF EXISTS people;
CREATE TABLE people (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255),
  role VARCHAR(255)
);
*/
DROP TABLE IF EXISTS locations;

CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    search_query VARCHAR(255),
    formatted_query VARCHAR(255),
    latitude NUMERIC(10, 7),
    longitude NUMERIC(10, 7)
);