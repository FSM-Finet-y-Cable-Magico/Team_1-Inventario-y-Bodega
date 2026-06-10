<script lang="ts">
	let {
		columns,
		data,
		onrowclick
	}: {
		columns: { key: string; label: string; width?: string }[];
		data: Record<string, unknown>[];
		onrowclick?: (row: Record<string, unknown>) => void;
	} = $props();
</script>

<div class="overflow-x-auto">
	<table class="w-full text-sm">
		<thead>
			<tr class="border-b border-border">
				{#each columns as col}
					<th
						class="text-left px-4 py-3 font-medium text-muted text-xs uppercase tracking-wider"
						style={col.width ? `width: ${col.width}` : undefined}
					>
						{col.label}
					</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each data as row, i}
				<tr
					class="border-b border-border transition-colors {onrowclick ? 'cursor-pointer hover:bg-surface-alt' : ''} {i % 2 === 0 ? 'bg-white' : 'bg-surface/50'}"
					onclick={() => onrowclick?.(row)}
					role={onrowclick ? 'button' : undefined}
					tabindex={onrowclick ? 0 : undefined}
					onkeydown={onrowclick ? (e: KeyboardEvent) => e.key === 'Enter' && onrowclick(row) : undefined}
				>
					{#each columns as col}
						<td class="px-4 py-3 text-foreground">
							{row[col.key] ?? '-'}
						</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
</div>
