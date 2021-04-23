# randomizer-api
backend for the lol randomizer

Notes

how do we start a new season?

Archive current season 
CREATE TABLE players_season_${prev_season} AS SELECT * FROM players;

Reset Players table now that it is archived
update players set wins=0,loses=0,winrate=0,rating=1500;

Update API Constants (date and current season)