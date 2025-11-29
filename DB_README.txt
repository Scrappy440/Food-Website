
BiteThat! Database (SQLite)

FILES

schema.sql - for tables,views, indexes
seed.sql- demo rows for developmenrs
bitethat.db - SQL database file
import_usda.py - loads USDA info into foods table (kcal/macros)
DB_README.txt - this file
sql.md- API/SQL for everyone
data/usda/- USDA  food information CSVs

## USDA Data Setup

The USDA CSVs are too large to commit to GitHub.

1. Download the USDA data bundle from:  
   https://drive.google.com/file/d/1PlCqakyt_MqD4L1jccvlWhoWzHB9Xc1i/view?usp=drive_link

2. Unzip into:
   Food-Website/
     data/
       usda/
         food.csv
         nutrient.csv
         food_nutrient.csv