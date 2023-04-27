$orig_csv = Import-Csv -Path $args[0]

# Extract only 'e_status' is 1 row.
$omitted = $orig_csv | Where-Object { $_.e_status -eq 0 } | Select-Object -Property @('station_cd', 'station_name', 'lon', 'lat')

$omitted | Export-Csv -Path $args[1] -NoTypeInformation -Delimiter ',' -Encoding utf8